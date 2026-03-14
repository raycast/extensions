import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import type {
  PermissionRequest,
  QuestionRequest,
  Session,
} from "@opencode-ai/sdk/v2";
import { useEffect, useMemo, useState } from "react";
import { QuestionReplyForm } from "../forms/QuestionReplyForm";
import { RenameSessionForm } from "../forms/RenameSessionForm";
import {
  assistantMessageMarkdown,
  conversationToDetailMarkdown,
} from "../lib/format";
import {
  abortSession,
  createClient,
  forkSession,
  getMessages,
  getSession,
  listPendingPermissions,
  listPendingQuestions,
  promptSession,
  rejectQuestion,
  renameSession,
  replyToQuestion,
  respondToPermission,
  subscribeToEvents,
} from "../lib/opencode";
import { OPENCODE_ICON, OPENCODE_TINT, SEND_ICON } from "../lib/raycast-icons";
import { createEmptyTranscriptState, reduceSessionEvent } from "../lib/state";
import { saveRecentSession, saveRecentTarget } from "../lib/storage";
import type {
  ComposerState,
  ConversationBlock,
  OpencodeTarget,
  RecentSession,
  RecentTarget,
  WorkspaceOption,
} from "../lib/types";
import { buildConversationBlocks } from "../lib/conversation";

type SessionDetailViewProps = {
  serverUrl: string;
  target: OpencodeTarget;
  sessionID: string;
  recentTargets: RecentTarget[];
  recentSessions: RecentSession[];
  workspaces: WorkspaceOption[];
  onTargetTouched: () => Promise<void>;
};

const SEND_ROW_ID = "__send__";

function eventBelongsToSession(event: unknown, sessionID: string): boolean {
  if (!event || typeof event !== "object") {
    return false;
  }

  const candidate = event as {
    properties?: {
      sessionID?: string;
      info?: { sessionID?: string };
      part?: { sessionID?: string };
      messageID?: string;
    };
  };

  const directSessionID = candidate.properties?.sessionID;
  const infoSessionID = candidate.properties?.info?.sessionID;
  const partSessionID = candidate.properties?.part?.sessionID;

  if (directSessionID) {
    return directSessionID === sessionID;
  }
  if (infoSessionID) {
    return infoSessionID === sessionID;
  }
  if (partSessionID) {
    return partSessionID === sessionID;
  }

  return false;
}

function eventMessageID(event: unknown): string | undefined {
  if (!event || typeof event !== "object") {
    return undefined;
  }
  const candidate = event as {
    properties?: {
      messageID?: string;
      part?: { messageID?: string };
    };
  };
  return (
    candidate.properties?.messageID ?? candidate.properties?.part?.messageID
  );
}

export function SessionDetailView(props: SessionDetailViewProps) {
  const client = useMemo(
    () => createClient(props.serverUrl),
    [props.serverUrl],
  );
  const { push } = useNavigation();
  const [session, setSession] = useState<Session>();
  const [state, setState] = useState(
    createEmptyTranscriptState(props.sessionID),
  );
  const [composer, setComposer] = useState<ComposerState>({
    draft: "",
    isSending: false,
  });
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [followLatest, setFollowLatest] = useState(false);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [hasUserSelectedItem, setHasUserSelectedItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh(): Promise<void> {
    setIsLoading(true);
    try {
      const [info, messages, permissions, questions] = await Promise.all([
        getSession(client, props.target, props.sessionID),
        getMessages(client, props.target, props.sessionID),
        listPendingPermissions(client, props.target),
        listPendingQuestions(client, props.target),
      ]);
      setSession(info);
      setState((current) => ({
        ...current,
        messages,
        pending: {
          permissions: permissions.filter(
            (item) => item.sessionID === props.sessionID,
          ),
          questions: questions.filter(
            (item) => item.sessionID === props.sessionID,
          ),
        },
      }));
      await saveRecentTarget(props.target);
      await saveRecentSession({ id: info.id, title: info.title }, props.target);
      await props.onTargetTouched();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [props.sessionID, props.target.directory, props.target.workspace]);

  useEffect(() => {
    const controller = new AbortController();
    void subscribeToEvents(
      client,
      props.target,
      controller.signal,
      (event) => {
        setState((current) => {
          if (eventBelongsToSession(event, props.sessionID)) {
            return reduceSessionEvent(current, event as never);
          }

          const messageID = eventMessageID(event);
          if (
            messageID &&
            current.messages.some((message) => message.info.id === messageID)
          ) {
            return reduceSessionEvent(current, event as never);
          }

          return current;
        });
      },
      async (error) => {
        const toast = await showToast({
          style: Toast.Style.Failure,
          title: "Event stream failed",
        });
        toast.message = error instanceof Error ? error.message : String(error);
      },
    );
    return () => controller.abort();
  }, [client, props.sessionID, props.target.directory, props.target.workspace]);

  const blocks = useMemo(
    () => buildConversationBlocks(state.messages),
    [state.messages],
  );
  const latestBlockId = blocks.at(-1)?.id;
  const latestMessageBlockId =
    [...blocks].reverse().find((block) => block.kind === "message")?.id ??
    latestBlockId;
  const assistantMarkdownByMessageId = useMemo(
    () =>
      new Map(
        state.messages
          .map(
            (message) =>
              [message.info.id, assistantMessageMarkdown(message)] as const,
          )
          .filter((entry) => entry[1]),
      ),
    [state.messages],
  );
  const showSendRow = composer.isSending || composer.draft.trim().length > 0;
  const isSessionActive =
    state.status?.type === "busy" || state.status?.type === "retry";
  const shouldControlSelection =
    !hasInitializedSelection ||
    !hasUserSelectedItem ||
    showSendRow ||
    followLatest ||
    isSessionActive;

  useEffect(() => {
    if (!hasInitializedSelection && !isLoading && latestMessageBlockId) {
      setSelectedItemId(latestMessageBlockId);
      setHasInitializedSelection(true);
      return;
    }
    if (showSendRow) {
      if (selectedItemId !== SEND_ROW_ID) {
        setSelectedItemId(SEND_ROW_ID);
      }
      return;
    }
    if ((followLatest || isSessionActive) && latestMessageBlockId) {
      setSelectedItemId(latestMessageBlockId);
    }
  }, [
    latestMessageBlockId,
    followLatest,
    hasInitializedSelection,
    isLoading,
    isSessionActive,
    selectedItemId,
    showSendRow,
  ]);

  const selectedBlock = blocks.find((block) => block.id === selectedItemId);
  const selectedMarkdown = selectedBlock
    ? selectedBlock.kind === "message"
      ? selectedBlock.markdown || selectedBlock.subtitle || ""
      : assistantMarkdownByMessageId.get(selectedBlock.messageID) ||
        ("detailMarkdown" in selectedBlock
          ? selectedBlock.detailMarkdown
          : selectedBlock.subtitle || "")
    : conversationToDetailMarkdown(state, session);

  async function sendMessage() {
    const text = composer.draft.trim();
    if (!text) {
      return;
    }
    setComposer((current) => ({ ...current, isSending: true }));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending message...",
    });
    try {
      await promptSession(client, {
        target: props.target,
        sessionID: props.sessionID,
        text,
      });
      setComposer({ draft: "", isSending: false });
      setFollowLatest(true);
      if (latestMessageBlockId) {
        setSelectedItemId(latestMessageBlockId);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
    } catch (error) {
      setComposer((current) => ({ ...current, isSending: false }));
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send message";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handlePermission(
    request: PermissionRequest,
    reply: "once" | "always" | "reject",
  ) {
    await respondToPermission(client, props.target, request.id, reply);
    setState((current) => ({
      ...current,
      pending: {
        ...current.pending,
        permissions: current.pending.permissions.filter(
          (item) => item.id !== request.id,
        ),
      },
    }));
  }

  async function handleQuestionReply(
    request: QuestionRequest,
    answers: Array<Array<string>>,
  ) {
    await replyToQuestion(client, props.target, request.id, answers);
    setState((current) => ({
      ...current,
      pending: {
        ...current.pending,
        questions: current.pending.questions.filter(
          (item) => item.id !== request.id,
        ),
      },
    }));
  }

  const lastMessage = state.messages.at(-1)?.info;
  const lastModel =
    lastMessage?.role === "assistant"
      ? `${lastMessage.providerID}/${lastMessage.modelID}`
      : lastMessage?.role === "user"
        ? `${lastMessage.model.providerID}/${lastMessage.model.modelID}`
        : undefined;

  function baseActions(block?: ConversationBlock) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Send Message"
            icon={SEND_ICON}
            onAction={sendMessage}
          />
          <Action
            title="Abort Run"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={async () => {
              await abortSession(client, props.target, props.sessionID);
              await refresh();
            }}
          />
          <Action
            title="Follow Latest"
            icon={Icon.ArrowDown}
            onAction={() => {
              setFollowLatest(true);
              if (latestMessageBlockId) {
                setSelectedItemId(latestMessageBlockId);
              }
            }}
          />
          <Action
            title="Fork Session"
            icon={Icon.ArrowRightCircle}
            onAction={async () => {
              const next = await forkSession(
                client,
                props.target,
                props.sessionID,
              );
              push(
                <SessionDetailView
                  serverUrl={props.serverUrl}
                  target={props.target}
                  sessionID={next.id}
                  recentTargets={props.recentTargets}
                  recentSessions={props.recentSessions}
                  workspaces={props.workspaces}
                  onTargetTouched={props.onTargetTouched}
                />,
              );
            }}
          />
          <Action
            title="Rename Session"
            icon={Icon.Pencil}
            onAction={() =>
              push(
                <RenameSessionForm
                  initialTitle={session?.title ?? ""}
                  onSubmit={async (title) => {
                    await renameSession(
                      client,
                      props.target,
                      props.sessionID,
                      title,
                    );
                    await refresh();
                  }}
                />,
              )
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
          <Action
            title="Copy Session ID"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(props.sessionID)}
          />
          {block ? (
            <Action
              title="Copy Selected Content"
              icon={Icon.CopyClipboard}
              onAction={() => Clipboard.copy(selectedMarkdown || "")}
            />
          ) : null}
        </ActionPanel.Section>
        {state.pending.permissions.length > 0 ? (
          <ActionPanel.Section title="Permission Requests">
            {state.pending.permissions.map((request) => (
              <Action
                key={`${request.id}-once`}
                title={`Approve Once: ${request.permission}`}
                icon={Icon.CheckCircle}
                onAction={() => handlePermission(request, "once")}
              />
            ))}
            {state.pending.permissions.map((request) => (
              <Action
                key={`${request.id}-always`}
                title={`Always Allow: ${request.permission}`}
                icon={Icon.Check}
                onAction={() => handlePermission(request, "always")}
              />
            ))}
            {state.pending.permissions.map((request) => (
              <Action
                key={`${request.id}-reject`}
                title={`Reject: ${request.permission}`}
                icon={Icon.XMarkCircle}
                onAction={() => handlePermission(request, "reject")}
              />
            ))}
          </ActionPanel.Section>
        ) : null}
        {state.pending.questions.length > 0 ? (
          <ActionPanel.Section title="Questions">
            {state.pending.questions.map((request) => (
              <Action
                key={request.id}
                title={`Reply: ${request.questions[0]?.header ?? "Question"}`}
                icon={SEND_ICON}
                onAction={() =>
                  push(
                    <QuestionReplyForm
                      request={request}
                      onSubmit={async (answers) => {
                        await handleQuestionReply(request, answers);
                      }}
                    />,
                  )
                }
              />
            ))}
            {state.pending.questions.map((request) => (
              <Action
                key={`${request.id}-reject`}
                title={`Reject: ${request.questions[0]?.header ?? "Question"}`}
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Reject question request?",
                    message: request.questions[0]?.question,
                  });
                  if (!confirmed) {
                    return;
                  }
                  await rejectQuestion(client, props.target, request.id);
                  setState((current) => ({
                    ...current,
                    pending: {
                      ...current.pending,
                      questions: current.pending.questions.filter(
                        (item) => item.id !== request.id,
                      ),
                    },
                  }));
                }}
              />
            ))}
          </ActionPanel.Section>
        ) : null}
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={session?.title || "Conversation"}
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchText={composer.draft}
      onSearchTextChange={(value) =>
        setComposer((current) => ({ ...current, draft: value }))
      }
      searchBarPlaceholder={
        composer.isSending
          ? "Sending..."
          : `Reply here${lastModel ? ` • ${lastModel}` : ""}${session?.title ? ` • ${session.title}` : ""}`
      }
      selectedItemId={shouldControlSelection ? selectedItemId : undefined}
      onSelectionChange={(id) => {
        if (!hasInitializedSelection) {
          return;
        }
        if (!id) {
          return;
        }
        if (id !== selectedItemId) {
          setHasUserSelectedItem(true);
        }
        setSelectedItemId(id);
        if (id !== SEND_ROW_ID && id !== latestMessageBlockId) {
          setFollowLatest(false);
          return;
        }
        if (!isSessionActive) {
          setFollowLatest(false);
        }
      }}
      actions={baseActions(selectedBlock)}
    >
      {showSendRow ? (
        <List.Section title="Reply">
          <List.Item
            id={SEND_ROW_ID}
            title={
              composer.draft.trim()
                ? `Send: ${composer.draft.trim()}`
                : "Sending..."
            }
            subtitle={
              composer.draft.trim()
                ? "Press Enter to send"
                : "Waiting for response"
            }
            icon={composer.isSending ? Icon.Clock : SEND_ICON}
            accessories={lastModel ? [{ text: lastModel }] : undefined}
            detail={
              <List.Item.Detail
                markdown={selectedMarkdown || "_No conversation yet_"}
              />
            }
            actions={baseActions(selectedBlock)}
          />
        </List.Section>
      ) : null}

      {state.pending.permissions.length > 0 ||
      state.pending.questions.length > 0 ? (
        <List.Section title="Blockers">
          {state.pending.permissions.map((request) => (
            <List.Item
              key={request.id}
              id={`permission:${request.id}`}
              title={`Permission: ${request.permission}`}
              subtitle={request.patterns.join(", ")}
              icon={{ source: Icon.Lock, tintColor: Color.Orange }}
              detail={
                <List.Item.Detail
                  markdown={selectedMarkdown || "_No conversation yet_"}
                />
              }
              actions={baseActions(selectedBlock)}
            />
          ))}
          {state.pending.questions.map((request) => (
            <List.Item
              key={request.id}
              id={`question:${request.id}`}
              title={request.questions[0]?.header ?? "Question"}
              subtitle={request.questions[0]?.question ?? "Needs input"}
              icon={{ source: Icon.QuestionMark, tintColor: Color.Red }}
              detail={
                <List.Item.Detail
                  markdown={selectedMarkdown || "_No conversation yet_"}
                />
              }
              actions={baseActions(selectedBlock)}
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Timeline">
        {blocks.length === 0 ? (
          <List.Item
            id="empty"
            title="No messages yet"
            subtitle="Send the first message from the search bar above"
            icon={OPENCODE_ICON}
            detail={
              <List.Item.Detail
                markdown={selectedMarkdown || "_No conversation yet_"}
              />
            }
            actions={baseActions()}
          />
        ) : (
          blocks.map((block) => {
            const icon =
              block.kind === "message"
                ? block.role === "assistant"
                  ? OPENCODE_ICON
                  : Icon.Person
                : block.kind === "tool-call"
                  ? block.status === "completed"
                    ? Icon.CheckCircle
                    : block.status === "error"
                      ? Icon.XMarkCircle
                      : Icon.Clock
                  : block.kind === "reasoning-summary"
                    ? Icon.LightBulb
                    : block.kind === "file"
                      ? Icon.Document
                      : Icon.Dot;

            const tintColor =
              block.kind === "message"
                ? block.role === "assistant"
                  ? OPENCODE_TINT
                  : Color.SecondaryText
                : block.kind === "tool-call"
                  ? block.status === "completed"
                    ? Color.Green
                    : block.status === "error"
                      ? Color.Red
                      : Color.Orange
                  : block.kind === "reasoning-summary"
                    ? Color.Yellow
                    : block.kind === "file"
                      ? Color.PrimaryText
                      : Color.SecondaryText;

            const markdown =
              block.kind === "message"
                ? block.markdown || block.subtitle || ""
                : assistantMarkdownByMessageId.get(block.messageID) ||
                  ("detailMarkdown" in block
                    ? block.detailMarkdown
                    : block.subtitle || "");

            return (
              <List.Item
                key={block.id}
                id={block.id}
                title={block.title}
                subtitle={block.kind === "message" ? block.subtitle : undefined}
                icon={{ source: icon, tintColor }}
                detail={
                  <List.Item.Detail markdown={markdown || "_No content yet_"} />
                }
                actions={baseActions(block)}
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
