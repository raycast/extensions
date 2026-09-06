import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
  environment,
  showInFinder,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import {
  Bot,
  ClientError,
  createLogin,
  Entry,
  entryAuthor,
  entryText,
  record,
} from "./core/client";
import { client, tokenClient, tokenStore } from "./session";
import { botIcon } from "./bot-icon";
import { attachmentOf, downloadFile, uploadFiles } from "./core/attachments";
import { approvalOf, questionOf } from "./core/interactions";
import { ApprovalView, QuestionForm } from "./interactions";
import { actOnResource, BotResource, listResources } from "./core/resources";
import {
  historyStore,
  ThreadBrowser,
  ThreadReader,
  SessionReader,
  useHistory,
} from "./thread-view";
import { plainPreview } from "./core/history";
import { selectedMessageId, markdownSource } from "./core/native-chat";
import { renderRichText } from "./core/rich-text";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request failed.";
}
async function report(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Grok Bot",
    message: errorMessage(error),
  });
}

function Login({ connected }: { connected: () => void }): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Sign in with the Cursor account that owns your Grok Bots. Your browser handles sign-in; Raycast stores the resulting session using its OAuth token storage.",
  );
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function signIn(): Promise<void> {
    if (busy) return;
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const attempt = createLogin();
      await open(attempt.url);
      setMessage(
        "Complete Cursor sign-in in your browser, including the final Sign in confirmation. Keep this command open. Waiting for Cursor…",
      );
      while (!controller.signal.aborted) {
        if (await client.finishLogin(attempt, controller.signal)) {
          historyStore.clear();
          connected();
          return;
        }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(done, 2000);
          function done(): void {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", done);
            resolve();
          }
          controller.signal.addEventListener("abort", done, { once: true });
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(errorMessage(error));
        await report(error);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Detail
      isLoading={busy}
      markdown={`# Grok Bot\n\n${message}`}
      actions={
        <ActionPanel>
          {busy ? (
            <Action
              title="Cancel Sign-In"
              icon={Icon.XMarkCircle}
              onAction={() => abort.current?.abort()}
            />
          ) : (
            <Action
              title="Sign in with Cursor"
              icon={Icon.Person}
              onAction={signIn}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Bots(): React.JSX.Element {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const { push } = useNavigation();
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setBots(await client.bots());
      setError(undefined);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void tokenStore
      .read()
      .then((tokens) => {
        if (!tokens) historyStore.clear();
        setSignedIn(Boolean(tokens));
        setLoading(false);
      })
      .catch(report);
  }, []);
  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn, refresh]);
  if (signedIn === false) return <Login connected={() => setSignedIn(true)} />;
  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search your bots…"
      navigationTitle={error ? "Grok Bot · Refresh failed" : "Grok Bot"}
    >
      {error && (
        <List.Item
          title="Couldn’t refresh bots"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} />
              <Action
                title="Sign in Again"
                onAction={async () => {
                  await tokenClient.removeTokens();
                  historyStore.clear();
                  setBots([]);
                  setSignedIn(false);
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && (
        <List.EmptyView
          title={loading ? "Connecting to your bots…" : "No bots yet"}
          description="Your existing Grok Bot teammates appear here."
          icon={Icon.Person}
        />
      )}
      {bots.map((bot) => (
        <List.Item
          key={bot.id}
          id={bot.id}
          title={bot.name}
          subtitle={bot.title}
          icon={botIcon(bot)}
          accessories={[
            {
              text: bot.awaitingUserResponse
                ? "Needs you"
                : bot.isRunning
                  ? "Working"
                  : "Ready",
            },
            ...(bot.hasUnread
              ? [{ icon: Icon.CircleFilled, tooltip: "Unread messages" }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Conversation"
                icon={Icon.List}
                onAction={() => push(<Conversation bot={bot} roster={bots} />)}
              />
              <Action
                title="Send Message"
                icon={Icon.Pencil}
                onAction={() => push(<Compose bot={bot} />)}
              />
              <Action
                title="Refresh Bots"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action
                title="View Routines"
                icon={Icon.Clock}
                onAction={() => push(<Resources bot={bot} kind="routines" />)}
              />
              <Action
                title="View Skills"
                icon={Icon.Book}
                onAction={() => push(<Resources bot={bot} kind="skills" />)}
              />
              <Action
                title="Open Grok Bot App"
                icon={Icon.AppWindow}
                onAction={() => open("/Applications/Grok Bot.app")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Compose({
  bot,
  replyToId,
  sent,
}: {
  bot: Bot;
  replyToId?: string;
  sent?: () => void;
}): React.JSX.Element {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false);
  const nonce = useRef(randomUUID());
  const { pop, push } = useNavigation();
  async function submit(): Promise<void> {
    if (locked.current || uncertain) return;
    if (!message.trim() || message.length > 100000) {
      await report(new Error("Write a message of 1 to 100,000 characters."));
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const attachments = await uploadFiles(client, bot.id, files);
      await client.send(bot.id, message, nonce.current, replyToId, attachments);
      await showToast({
        style: Toast.Style.Success,
        title: "Message accepted",
        message: bot.name,
      });
      sent?.();
      pop();
    } catch (error) {
      if (error instanceof ClientError && error.uncertain) setUncertain(true);
      await report(error);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      navigationTitle={`Message ${bot.name}`}
      actions={
        <ActionPanel>
          {!uncertain && (
            <Action.SubmitForm
              title="Send Message"
              icon={Icon.Message}
              onSubmit={submit}
            />
          )}
          <Action
            title="Preview Formatting"
            icon={Icon.Document}
            onAction={() =>
              push(
                <Detail
                  navigationTitle="Message Preview"
                  markdown={
                    renderRichText(message) || "Write a message to preview it."
                  }
                />,
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description title="To" text={bot.name} />
      <Form.Description
        title="Formatting"
        text="Use Markdown headings, lists, fenced code blocks, and LaTeX. Preview Formatting shows how your message will appear."
      />
      {replyToId && (
        <Form.Description
          title="Reply"
          text="Replying to the selected message"
        />
      )}
      {uncertain && (
        <Form.Description
          title="Delivery uncertain"
          text="Return to the conversation and check before composing another message. This draft has not been automatically resent."
        />
      )}
      <Form.TextArea
        id="message"
        title="Message"
        value={message}
        onChange={setMessage}
        placeholder={`Message ${bot.name}…`}
        error={
          message.length > 100000 ? "Maximum 100,000 characters" : undefined
        }
      />
      <Form.FilePicker
        id="files"
        title="Attachments"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        canChooseDirectories={false}
        info="Up to six files. 25 MB each, or 200 MB for video."
      />
    </Form>
  );
}

function Conversation({
  bot,
  roster,
}: {
  bot: Bot;
  roster: Bot[];
}): React.JSX.Element {
  const { push } = useNavigation();
  function composer(
    rootId: string | undefined,
    sent: () => void,
  ): React.JSX.Element {
    return <Compose bot={bot} replyToId={rootId} sent={sent} />;
  }
  function messages(rootId?: string): React.JSX.Element {
    return (
      <MessageActions
        bot={bot}
        roster={roster}
        key={rootId ?? "main"}
        threadRootId={rootId}
        onBrowseThreads={() =>
          push(
            <ThreadBrowser
              bot={bot}
              renderComposer={composer}
              renderMessages={messages}
            />,
          )
        }
        onOpenThread={(id, title) =>
          push(
            <ThreadReader
              bot={bot}
              rootId={id}
              title={title}
              renderComposer={composer}
              renderMessages={messages}
            />,
          )
        }
      />
    );
  }
  return (
    <SessionReader
      bot={bot}
      renderComposer={composer}
      renderMessages={messages}
    />
  );
}

function MessageActions({
  bot,
  roster,
  threadRootId,
  onOpenThread,
  onBrowseThreads,
}: {
  bot: Bot;
  roster: Bot[];
  threadRootId?: string;
  onOpenThread: (rootId: string, title: string) => void;
  onBrowseThreads: () => void;
}): React.JSX.Element {
  const current = useHistory(bot.id, threadRootId);
  const page = {
    entries: current.snapshot.entries,
    nextBeforeSeq: current.snapshot.before,
  };
  const loading = current.loading;
  const error = current.snapshot.error;
  const refresh = current.refresh;
  const loadOlder = current.loadOlder;
  const [selection, setSelection] = useState<string>();
  const [search, setSearch] = useState("");
  const selected = selectedMessageId(page.entries, selection);
  const latest = page.entries.at(-1)?.id;
  const { push } = useNavigation();
  useEffect(() => {
    if (selected && selection !== selected) setSelection(selected);
  }, [selected, selection]);
  async function interrupt(): Promise<void> {
    if (
      await confirmAlert({
        title: `Stop ${bot.name}?`,
        message: "Interrupt this bot’s current work.",
        primaryAction: {
          title: "Stop Work",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await client.command(
          "interruptAgentRun",
          { id: bot.id },
          { mutation: true },
        );
        await refresh();
      } catch (e) {
        await report(e);
      }
    }
  }
  const actions = (entry?: Entry): React.JSX.Element => (
    <ActionPanel>
      {entry && attachmentOf(entry) && (
        <Action
          title="Download File"
          icon={Icon.Download}
          onAction={async () => {
            const attachment = attachmentOf(entry);
            if (!attachment) return;
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: "Downloading file",
            });
            try {
              const path = await downloadFile(
                client,
                bot.id,
                attachment.path,
                attachment.name,
                `${environment.supportPath}/downloads`,
              );
              toast.style = Toast.Style.Success;
              toast.title = "File downloaded";
              await showInFinder(path);
            } catch (error) {
              toast.hide();
              await report(error);
            }
          }}
        />
      )}
      {entry &&
        questionOf(entry) &&
        questionOf(entry)?.answered === undefined && (
          <Action
            title="Answer Question"
            icon={Icon.Message}
            onAction={() =>
              push(
                <QuestionForm
                  agentId={bot.id}
                  entry={entry}
                  finished={() => void refresh()}
                />,
              )
            }
          />
        )}
      {entry && approvalOf(entry)?.status === "pending" && (
        <Action
          title="Review Approval"
          icon={Icon.CheckCircle}
          onAction={() =>
            push(
              <ApprovalView
                agentId={bot.id}
                entry={entry}
                finished={() => void refresh()}
              />,
            )
          }
        />
      )}
      <Action
        title="Write Message"
        icon={Icon.Pencil}
        onAction={() =>
          push(
            <Compose
              bot={bot}
              replyToId={threadRootId}
              sent={() => void refresh()}
            />,
          )
        }
        shortcut={Keyboard.Shortcut.Common.New}
      />
      {entry && (entry.kind === "message" || entry.kind === "send-message") && (
        <Action
          title="Open Reply Thread"
          icon={Icon.Message}
          onAction={() =>
            onOpenThread(
              typeof entry.replyTo === "string" ? entry.replyTo : entry.id,
              plainPreview(entryText(entry)) || "Reply Thread",
            )
          }
        />
      )}
      {entry && (
        <Action
          title="Reply to Message"
          icon={Icon.Reply}
          onAction={() =>
            push(
              <Compose
                bot={bot}
                replyToId={entry.id}
                sent={() => void refresh()}
              />,
            )
          }
        />
      )}
      {entry && (
        <Action
          title="Read Message Full Width"
          icon={Icon.Document}
          onAction={() =>
            push(
              <Detail
                navigationTitle={entryAuthor(entry, bot.name)}
                markdown={renderRichText(entryText(entry))}
                actions={actions(entry)}
              />,
            )
          }
        />
      )}
      {entry && (
        <Action
          title="View Markdown Source"
          icon={Icon.Code}
          onAction={() =>
            push(
              <Detail
                navigationTitle="Markdown Source"
                markdown={markdownSource(entryText(entry))}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Markdown"
                      content={entryText(entry)}
                    />
                  </ActionPanel>
                }
              />,
            )
          }
        />
      )}
      {entry && (
        <Action.CopyToClipboard
          title="Copy Message"
          content={entryText(entry)}
        />
      )}
      {entry && (entry.kind === "send-message" || entry.kind === "message") && (
        <ActionPanel.Submenu title="React to Message" icon={Icon.Emoji}>
          {["👍", "❤️", "✅", "👀"].map((emoji) => (
            <Action
              key={emoji}
              title={emoji}
              onAction={async () => {
                try {
                  await client.command(
                    "reactToMessage",
                    { agentId: bot.id, entryId: entry.id, emoji },
                    { mutation: true },
                  );
                  await refresh();
                } catch (error) {
                  await report(error);
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title="Refresh History"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      {page.nextBeforeSeq !== undefined && (
        <Action
          title="Load Older Messages"
          icon={Icon.ArrowUp}
          onAction={loadOlder}
        />
      )}
      <Action
        title="Jump to Latest"
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
        onAction={() => {
          setSearch("");
          setSelection(latest);
        }}
      />
      <Action
        title="Browse Bot Threads"
        icon={Icon.List}
        onAction={onBrowseThreads}
      />
      <Action title="Stop Bot" icon={Icon.Stop} onAction={interrupt} />
      <Action
        title="Open Grok Bot App"
        icon={Icon.AppWindow}
        onAction={() => open("/Applications/Grok Bot.app")}
      />
    </ActionPanel>
  );
  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={`${bot.name} · ${threadRootId ? "Reply Thread" : "Main Conversation"}${selected && selected !== latest ? " · Newer messages below" : ""}${error ? " · Refresh failed" : ""}`}
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id && page.entries.some((entry) => entry.id === id))
          setSelection(id);
      }}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search loaded messages…"
    >
      {error && page.entries.length === 0 && (
        <List.Item
          title="Conversation refresh failed"
          icon={Icon.ExclamationMark}
          detail={<List.Item.Detail markdown={error} />}
          actions={actions()}
        />
      )}
      <List.EmptyView
        title={loading ? "Loading conversation…" : "No messages yet"}
        actions={actions()}
      />
      {page.entries.map((entry) => (
        <List.Item
          key={entry.id}
          id={entry.id}
          title={entryAuthor(entry, bot.name)}
          subtitle={plainPreview(entryText(entry))}
          keywords={[entryText(entry)]}
          icon={
            (entry.role === "user" || entry.kind === "user-attachment") &&
            !record(entry.fromAgent)
              ? Icon.Person
              : botIcon(
                  roster.find(
                    (peer) =>
                      record(entry.fromAgent) && peer.id === entry.fromAgent.id,
                  ) ?? bot,
                )
          }
          detail={
            <List.Item.Detail
              markdown={
                renderRichText(entryText(entry)) +
                (entry.isStreaming === true ? "\\n\\n*Responding…*" : "")
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="From"
                    text={entryAuthor(entry, bot.name)}
                  />
                  {typeof entry.timestampMs === "number" && (
                    <List.Item.Detail.Metadata.Label
                      title="Sent"
                      text={new Date(entry.timestampMs).toLocaleString()}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={actions(entry)}
        />
      ))}
    </List>
  );
}

function Resources({
  bot,
  kind,
}: {
  bot: Bot;
  kind: "routines" | "skills";
}): React.JSX.Element {
  const [items, setItems] = useState<BotResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    void listResources(client, bot.id, kind, controller.signal)
      .then(setItems)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [bot.id, kind]);
  const locked = useRef(false);
  async function act(
    item: BotResource,
    action: "run" | "toggle",
  ): Promise<void> {
    if (locked.current) return;
    const title =
      action === "run"
        ? `Run ${item.name} now?`
        : `${item.enabled ? "Pause" : "Resume"} ${item.name}?`;
    if (
      !(await confirmAlert({
        title,
        message:
          action === "run"
            ? "The bot will execute the saved instructions shown in this view."
            : "This changes whether the routine runs automatically.",
        primaryAction: {
          title:
            action === "run" ? "Run Now" : item.enabled ? "Pause" : "Resume",
        },
      }))
    )
      return;
    locked.current = true;
    setLoading(true);
    try {
      await actOnResource(client, bot.id, kind, item, action);
      setItems(await listResources(client, bot.id, kind));
      setError(undefined);
      await showToast({
        style: Toast.Style.Success,
        title: action === "run" ? "Run requested" : "Routine updated",
      });
    } catch (error) {
      await report(error);
    } finally {
      locked.current = false;
      setLoading(false);
    }
  }
  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={`${bot.name} · ${kind}`}
    >
      <List.EmptyView title={error ?? (loading ? "Loading…" : `No ${kind}`)} />
      {items.map((item) => (
        <List.Item
          key={String(item.id)}
          title={String(item.name)}
          icon={kind === "routines" ? Icon.Clock : Icon.Book}
          detail={<List.Item.Detail markdown={item.text} />}
          accessories={
            kind === "routines"
              ? [{ text: item.enabled ? "Enabled" : "Paused" }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Run Now"
                icon={Icon.Play}
                onAction={() => act(item, "run")}
              />
              {kind === "routines" && (
                <Action
                  title={item.enabled ? "Pause Routine" : "Resume Routine"}
                  icon={item.enabled ? Icon.Pause : Icon.Play}
                  onAction={() => act(item, "toggle")}
                />
              )}
              <Action.CopyToClipboard content={item.text} />
              <Action
                title="Open Grok Bot App"
                onAction={() => open("/Applications/Grok Bot.app")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
