import { failToast, onErrorToast } from "@chrismessina/raycast-kit";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  open as openUrl,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { PersonView } from "./components/entities";
import { ErrorEmptyView } from "./components/error-view";
import { useDescriptionOnly, ViewSection } from "./components/view-actions";
import {
  acceptNetworkRequest,
  archiveNetworkRequest,
  fetchConversations,
  fetchNetworkRequests,
  fetchThread,
} from "./lib/api";
import { clipboardText } from "./lib/errors";
import { day } from "./lib/format";
import {
  absolute,
  connectionSentence,
  COSIGN_ORIGIN,
  escapeMd,
  nomineeIdFromPath,
  quote,
  signalLabel,
  threadMarkdown,
  xProfile,
} from "./lib/inbox";
import { avatar } from "./lib/meta";
import type { Conversation, NetworkRequest } from "./lib/types";

function ProfileAction({ profileUrl }: { profileUrl: string }) {
  const nomineeId = nomineeIdFromPath(profileUrl);
  return nomineeId ? (
    <Action.Push title="Show Full Profile" icon={Icon.Person} target={<PersonView nomineeId={nomineeId} />} />
  ) : null;
}

/**
 * A pushed thread. Reading it here does not mark it read on Cosign (`read_conversations` says so), so the inbox keeps
 * showing Cosign's own unread state after Back. Clearing it locally would show a state Cosign doesn't hold.
 */
function ThreadView({ conversation }: { conversation: Conversation }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchThread, [conversation.threadId], {
    onError: onErrorToast({ title: "Couldn't load conversation" }),
  });
  const { counterpart } = conversation;
  const body = data ? threadMarkdown(counterpart, data.page) : "";
  return (
    <Detail
      navigationTitle={counterpart.name}
      isLoading={isLoading}
      markdown={
        data
          ? `${body}${data.isDone ? "" : "\n\n---\n\n_Earlier messages are on Cosign._"}`
          : error
            ? "Couldn’t load this conversation."
            : "Loading conversation…"
      }
      actions={
        <ActionPanel>
          {error && !data ? (
            <>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action
                title="Copy Error"
                icon={Icon.CopyClipboard}
                onAction={() => Clipboard.copy(clipboardText("Couldn't load conversation", error))}
              />
            </>
          ) : null}
          <ConversationActions conversation={conversation} replyFirst />
        </ActionPanel>
      }
    />
  );
}

function ConversationActions({ conversation, replyFirst }: { conversation: Conversation; replyFirst?: boolean }) {
  const reply = (
    <Action.OpenInBrowser key="reply" title="Reply on Cosign" icon={Icon.Reply} url={absolute(conversation.url)} />
  );
  return (
    <>
      {replyFirst ? (
        reply
      ) : (
        <Action.Push
          title="Read Conversation"
          icon={Icon.Message}
          target={<ThreadView conversation={conversation} />}
        />
      )}
      {replyFirst ? null : reply}
      <ProfileAction profileUrl={conversation.counterpart.profileUrl} />
      <Action.CopyToClipboard title="Copy Conversation Link" content={absolute(conversation.url)} />
    </>
  );
}

async function actOnRequest(
  request: NetworkRequest,
  verb: { progress: string; done: string; failed: string },
  run: () => Promise<unknown>,
  settle: (reviewKey: string, run: Promise<unknown>) => Promise<unknown>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: verb.progress });
  try {
    const pending = run();
    await settle(request.reviewKey, pending);
    toast.style = Toast.Style.Success;
    toast.title = verb.done;
    toast.message = request.name;
    // Accept answers with the new chat's `{ threadId, url }`; archive answers with null.
    const chat = ((await pending) as { url?: unknown } | null)?.url;
    if (typeof chat === "string") {
      toast.primaryAction = { title: "Open Conversation", onAction: () => openUrl(absolute(chat)) };
    }
  } catch (error) {
    failToast(toast, error, { title: verb.failed });
  }
}

function RequestActions({
  request,
  settle,
}: {
  request: NetworkRequest;
  settle: (reviewKey: string, run: Promise<unknown>) => Promise<unknown>;
}) {
  return (
    <>
      <Action
        title="Accept Connection"
        icon={Icon.CheckCircle}
        onAction={async () => {
          const ok = await confirmAlert({
            title: `Accept ${request.name}?`,
            message: "They will be told you accepted, and you can message each other on Cosign.",
            primaryAction: { title: "Accept" },
          });
          if (!ok) return;
          await actOnRequest(
            request,
            { progress: "Accepting…", done: "Accepted", failed: "Couldn't accept request" },
            () => acceptNetworkRequest(request),
            settle,
          );
        }}
      />
      <ProfileAction profileUrl={request.profileUrl} />
      <Action.OpenInBrowser title="Open on Cosign" url={absolute(request.profileUrl)} />
      <Action
        title="Archive Request"
        icon={Icon.Tray}
        shortcut={Keyboard.Shortcut.Common.Remove}
        style={Action.Style.Destructive}
        onAction={() =>
          actOnRequest(
            request,
            { progress: "Archiving…", done: "Archived", failed: "Couldn't archive request" },
            () => archiveNetworkRequest(request, true),
            settle,
          )
        }
      />
    </>
  );
}

function requestMarkdown(r: NetworkRequest): string {
  const jobs = r.experiences
    .map(
      (e) =>
        `- ${escapeMd(e.title)} at ${escapeMd(e.organizationName)}${e.dateRange ? ` (${escapeMd(e.dateRange)})` : ""}`,
    )
    .join("\n");
  const mutual = (r.mutualConnections ?? []).map((m) => escapeMd(m.name)).join(", ");
  return [
    `# ${escapeMd(r.name)}`,
    r.tagline ? escapeMd(r.tagline) : "",
    r.signalKinds.length ? `**Signal:** ${r.signalKinds.map((k) => escapeMd(signalLabel(k))).join(", ")}` : "",
    mutual ? `**Mutual connections:** ${mutual}` : "",
    jobs ? `## Experience\n\n${jobs}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function Command() {
  const conversations = useCachedPromise(fetchConversations, [], {
    keepPreviousData: true,
    onError: onErrorToast({ title: "Couldn't load conversations" }),
  });
  const requests = useCachedPromise(fetchNetworkRequests, [], {
    keepPreviousData: true,
    onError: onErrorToast({ title: "Couldn't load connection requests" }),
  });
  const [showDetail, setShowDetail] = useCachedState("show-detail-inbox", true);
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
  // Requests already accepted or archived this session stay hidden even if an older read lands afterward.
  const [handled, setHandled] = useState<string[]>([]);
  const open = (requests.data?.page ?? []).filter((r) => !r.closed && !handled.includes(r.reviewKey));
  const threads = conversations.data ?? [];
  // More request pages exist than the extension follows; say so instead of presenting the list as complete.
  const partial = requests.data?.isDone === false;
  const refresh = () => {
    conversations.revalidate();
    requests.revalidate();
  };
  // After Accept, move the selection to the new chat once the refreshed list has it.
  const [focus, setFocus] = useState<string>();
  const settle = async (reviewKey: string, run: Promise<unknown>) => {
    const result = (await run) as { threadId?: unknown } | null;
    setHandled((ids) => [...ids, reviewKey]);
    if (typeof result?.threadId === "string") setFocus(`thread:${result.threadId}`);
    refresh();
  };
  const selectedItemId = focus && threads.some((c) => `thread:${c.threadId}` === focus) ? focus : undefined;
  const isLoading = conversations.isLoading || requests.isLoading;
  // An empty cached result must not hide a failed refresh: with nothing to show, any error wins.
  const failed = !open.length && !threads.length ? (conversations.error ?? requests.error) : undefined;

  const refreshAction = (
    <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={refresh} />
  );
  const viewSection = (
    <ViewSection
      descriptionOnly={descriptionOnly}
      onToggleDescription={toggleDescriptionOnly}
      sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      // Best effort: any selection change away from the new chat drops the target, so it can never pull the selection back.
      onSelectionChange={(id) => {
        if (selectedItemId && id !== selectedItemId) setFocus(undefined);
      }}
      isShowingDetail={showDetail && (open.length > 0 || threads.length > 0)}
      searchBarPlaceholder="Filter conversations and requests"
    >
      <List.Section title="Connection Requests" subtitle={open.length ? String(open.length) : undefined}>
        {open.map((r) => (
          <List.Item
            key={r.reviewKey}
            id={`request:${r.reviewKey}`}
            icon={avatar(r.imageUrl)}
            title={r.name}
            subtitle={showDetail ? undefined : (r.tagline ?? undefined)}
            keywords={r.tagline ? [r.tagline] : undefined}
            accessories={
              showDetail
                ? undefined
                : [
                    ...(r.verified ? [{ icon: Icon.CheckCircle, tooltip: "Verified" }] : []),
                    { date: new Date(r.latestSignalAt), tooltip: "Latest signal" },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={requestMarkdown(r)}
                metadata={
                  descriptionOnly ? undefined : (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Latest signal" text={day(r.latestSignalAt)} />
                      {r.verified ? (
                        <List.Item.Detail.Metadata.Label title="Verified" icon={Icon.CheckCircle} text="Yes" />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            }
            actions={
              <ActionPanel>
                <RequestActions request={r} settle={settle} />
                {viewSection}
                <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
        {partial ? (
          <List.Item
            id="more-requests"
            icon={Icon.Ellipsis}
            title="More requests on Cosign"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Cosign" url={`${COSIGN_ORIGIN}/signals?view=open`} />
                {refreshAction}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Conversations" subtitle={threads.length ? String(threads.length) : undefined}>
        {threads.map((c) => {
          return (
            <List.Item
              key={c.threadId}
              id={`thread:${c.threadId}`}
              icon={avatar(c.counterpart.imageUrl)}
              title={c.counterpart.name}
              subtitle={showDetail ? undefined : (c.lastMessagePreview ?? undefined)}
              keywords={[c.counterpart.xUsername ?? "", c.lastMessagePreview ?? ""].filter(Boolean)}
              accessories={
                showDetail
                  ? undefined
                  : [
                      ...(c.unread
                        ? [{ icon: { source: Icon.Circle, tintColor: Color.Blue }, tooltip: "Unread" }]
                        : []),
                      { date: new Date(c.lastMessageAt), tooltip: "Last message" },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={`${c.lastMessagePreview ? quote(c.lastMessagePreview) : "_No messages yet._"}\n\n_Press Enter to read the entire conversation._`}
                  metadata={
                    descriptionOnly ? undefined : (
                      <List.Item.Detail.Metadata>
                        {c.unread ? (
                          <List.Item.Detail.Metadata.Label
                            title="Status"
                            icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                            text="Unread"
                          />
                        ) : null}
                        <List.Item.Detail.Metadata.Label title="Last message" text={day(c.lastMessageAt)} />
                        {connectionSentence(c) ? (
                          <List.Item.Detail.Metadata.Label
                            title="Connected because"
                            text={connectionSentence(c) ?? ""}
                          />
                        ) : null}
                        {c.counterpart.xUsername ? (
                          <List.Item.Detail.Metadata.Link
                            title="X"
                            text={xProfile(c.counterpart.xUsername).label}
                            target={xProfile(c.counterpart.xUsername).url}
                          />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    )
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ConversationActions conversation={c} />
                  {viewSection}
                  <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {!isLoading && !open.length && !threads.length && !partial ? (
        failed ? (
          <ErrorEmptyView title="Couldn't load your inbox" error={failed} retry={refresh} />
        ) : (
          <List.EmptyView
            title="Nothing in your inbox"
            description="New messages and connection requests show up here."
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
        )
      ) : null}
    </List>
  );
}
