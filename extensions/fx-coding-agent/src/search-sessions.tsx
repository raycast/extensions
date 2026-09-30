import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { FxErrorActions } from "./components/fx-error-actions";
import {
  FxExecution,
  FxHistoryTurn,
  FxSession,
  FxSessionDetail,
  FxSessionsResponse,
  getFxPreferences,
  isFxNotInstalled,
  launchInTerminal,
  markdownEscape,
  parseSessionDetail,
  parseSessions,
  runFxJson,
  workspaceName,
} from "./lib/fx";

const PAGE_SIZE = 100;

async function openSession(executable: string, session: FxSession, mode: "resume" | "inspect" | "record") {
  try {
    const args =
      mode === "resume"
        ? ["resume", "--id", session.id]
        : mode === "record"
          ? ["session", "resume", "--id", session.id, "--record"]
          : ["session", "--id", session.id, "--json"];
    await launchInTerminal(executable, args, session.workspace_root);
  } catch (error) {
    const operation = mode === "inspect" ? "Inspect" : "Resume";
    await showToast({
      style: Toast.Style.Failure,
      title: `Could Not ${operation} Session`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function bounded(value: string, length = 1_200): string {
  const trimmed = value.trim();
  return trimmed.length <= length ? trimmed : `${trimmed.slice(0, length).trimEnd()}…`;
}

function userText(turn: FxHistoryTurn): string {
  if (typeof turn.user === "string") return turn.user;
  return turn.user?.text || "";
}

function executionMarkdown(execution?: FxExecution): string {
  if (!execution) return "";
  const activity: string[] = [];
  const progress: string[] = [];

  for (const step of execution.tool_steps || []) {
    if (step.assistant?.trim()) progress.push(bounded(step.assistant));
    const resultsById = new Map((step.tool_results || []).map((result) => [result.tool_call_id, result]));
    const renderedResults = new Set<string>();

    for (const call of step.tool_calls || []) {
      const result = call.id ? resultsById.get(call.id) : undefined;
      const name = result?.tool_name || call.name || "tool";
      const status = result?.status || "requested";
      const marker =
        status === "ok" || status === "success" || status === "completed" ? "✓" : status === "failed" ? "✕" : "•";
      activity.push(`- ${marker} \`${markdownEscape(name)}\` — ${markdownEscape(status)}`);
      if (result?.tool_call_id) renderedResults.add(result.tool_call_id);
    }

    for (const result of step.tool_results || []) {
      if (result.tool_call_id && renderedResults.has(result.tool_call_id)) continue;
      activity.push(
        `- • \`${markdownEscape(result.tool_name || "tool")}\` — ${markdownEscape(result.status || "completed")}`,
      );
    }
  }

  const files = (execution.files || [])
    .map((file) => {
      if (typeof file === "string") return file;
      if (!file || typeof file !== "object") return undefined;
      const record = file as Record<string, unknown>;
      const candidate = record.path || record.file || record.name;
      return typeof candidate === "string" ? candidate : undefined;
    })
    .filter((file): file is string => Boolean(file));

  const sections: string[] = [];
  if (progress.length > 0) {
    sections.push(`#### Progress\n\n${progress.map((item) => `> ${markdownEscape(item)}`).join("\n\n")}`);
  }
  if (activity.length > 0) sections.push(`#### Tool Activity\n\n${activity.join("\n")}`);
  if (files.length > 0) {
    sections.push(`#### Files\n\n${files.map((file) => `- \`${markdownEscape(file)}\``).join("\n")}`);
  }
  return sections.length > 0 ? `\n\n${sections.join("\n\n")}` : "";
}

function turnMarkdown(turn: FxHistoryTurn, index: number): string {
  if (turn.kind === "compacted_summary") {
    const removed = turn.removed_turn_count ? ` (${turn.removed_turn_count} earlier turns)` : "";
    return `## Compacted Context${removed}\n\n${turn.summary?.trim() || "_No compacted summary is available._"}`;
  }

  const prompt = userText(turn).trim();
  const response = turn.assistant?.trim();
  const images = typeof turn.user === "object" ? turn.user.images || [] : [];
  const imageList = images.length
    ? `\n\n${images.map((image) => `- Attachment: \`${markdownEscape(image.path || "image")}\``).join("\n")}`
    : "";
  const kindLabel =
    turn.kind === "background_command" ? " · Background" : turn.kind === "interrupted" ? " · Interrupted" : "";
  const extras: string[] = [];
  if (turn.log_path) extras.push(`Log: \`${markdownEscape(turn.log_path)}\``);
  if (turn.url) extras.push(`[Open background task](${turn.url})`);
  if (turn.completed_tool_names?.length) {
    extras.push(
      `Completed tools: ${turn.completed_tool_names.map((name) => `\`${markdownEscape(name)}\``).join(", ")}`,
    );
  }

  return [
    `## Turn ${index + 1}${kindLabel}`,
    `### You\n\n${prompt ? markdownEscape(prompt) : "_No text was saved for this turn._"}${imageList}`,
    `### fx\n\n${response || (turn.kind === "interrupted" ? "_This turn was interrupted before fx finished._" : "_No assistant response was saved._")}`,
    extras.length ? extras.join("  \n") : "",
    executionMarkdown(turn.execution),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sessionMarkdown(session: FxSession, detail?: FxSessionDetail): string {
  const title = session.title || "Untitled Session";
  if (!detail) {
    const preview = session.preview?.trim();
    return `# ${markdownEscape(title)}\n\n${preview ? markdownEscape(preview) : "_Loading saved conversation…_"}`;
  }
  const history = detail.history.map(turnMarkdown).join("\n\n---\n\n");
  return `# ${markdownEscape(title)}\n\n${history || "_This session has no saved conversation history._"}`;
}

function RenameSessionForm({ executable, session }: { executable: string; session: FxSession }) {
  async function rename(values: { title: string }) {
    const title = values.title.trim();
    if (!title) return;
    await Clipboard.copy(`/rename ${title}`);
    await showToast({
      style: Toast.Style.Success,
      title: "Rename Command Copied",
      message: "Paste it into the fx session after Terminal opens.",
    });
    await openSession(executable, session, "resume");
  }

  return (
    <Form
      navigationTitle="Rename fx Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Rename Command and Resume" icon={Icon.Pencil} onSubmit={rename} />
        </ActionPanel>
      }
    >
      <Form.Description text="fx currently exposes session renaming through the interactive /rename command. Raycast will copy that command and open this exact session in Terminal." />
      <Form.TextField id="title" title="New Name" defaultValue={session.title || ""} placeholder="Session name" />
    </Form>
  );
}

async function recoverSession(executable: string, session: FxSession, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: "Recover this session?",
    message: "fx will create a recovered copy while keeping the original saved session unchanged.",
    primaryAction: { title: "Recover", style: Alert.ActionStyle.Default },
  });
  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Recovering Session…" });
  try {
    const result = await runFxJson<Record<string, unknown>>(
      executable,
      ["session", "recover", "--id", session.id, "--json"],
      { cwd: session.workspace_root, timeoutMs: 60_000 },
    );
    const recoveredId =
      typeof result.id === "string" ? result.id : typeof result.session_id === "string" ? result.session_id : undefined;
    toast.style = Toast.Style.Success;
    toast.title = "Session Recovered";
    toast.message = recoveredId ? `Created ${recoveredId}` : "A recovered session copy was created.";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Recover Session";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function useSessionHistory(executable: string, session: FxSession) {
  return usePromise(
    async (fxExecutable: string, id: string, workspace: string) =>
      parseSessionDetail(
        await runFxJson<FxSessionDetail>(fxExecutable, ["session", "--id", id, "--json"], { cwd: workspace }),
      ),
    [executable, session.id, session.workspace_root],
    { failureToastOptions: { title: "Could Not Load Session History" } },
  );
}

function SessionDetail({
  executable,
  session,
  revalidate,
}: {
  executable: string;
  session: FxSession;
  revalidate: () => void;
}) {
  const { data, error, isLoading, revalidate: reloadDetail } = useSessionHistory(executable, session);
  const refresh = () => {
    reloadDetail();
    revalidate();
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Could Not Load Session History\n\n${markdownEscape(error.message)}\n\n${sessionMarkdown(session)}`
          : sessionMarkdown(session, data)
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workspace" text={session.workspace_root} icon={Icon.Folder} />
          <Detail.Metadata.Label
            title="Turns"
            text={String(data?.history_len ?? session.history_len)}
            icon={Icon.Message}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(data?.updated_at_ms ?? session.updated_at_ms).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(data?.created_at_ms ?? session.created_at_ms).toLocaleString()}
          />
          {(data?.conversation_language ?? session.conversation_language) ? (
            <Detail.Metadata.Label
              title="Language"
              text={data?.conversation_language ?? session.conversation_language ?? ""}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Session ID" text={session.id} />
        </Detail.Metadata>
      }
      actions={
        error ? (
          <FxErrorActions error={error} retry={reloadDetail} />
        ) : (
          <SessionActions executable={executable} session={session} revalidate={refresh} showDetails={false} />
        )
      }
    />
  );
}

function SessionListDetail({ executable, session }: { executable: string; session: FxSession }) {
  const { data, error, isLoading } = useSessionHistory(executable, session);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Could Not Load Session History\n\n${markdownEscape(error.message)}\n\n${sessionMarkdown(session)}`
          : sessionMarkdown(session, data)
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Workspace" text={session.workspace_root} icon={Icon.Folder} />
          <List.Item.Detail.Metadata.Label
            title="Turns"
            text={String(data?.history_len ?? session.history_len)}
            icon={Icon.Message}
          />
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={new Date(data?.updated_at_ms ?? session.updated_at_ms).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Label title="Session ID" text={session.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SessionActions({
  executable,
  session,
  revalidate,
  showDetails = true,
}: {
  executable: string;
  session: FxSession;
  revalidate: () => void;
  showDetails?: boolean;
}) {
  const resumeCommand = `${executable} resume --id ${session.id}`;
  return (
    <ActionPanel>
      <Action title="Resume Session" icon={Icon.Terminal} onAction={() => openSession(executable, session, "resume")} />
      {showDetails ? (
        <Action.Push
          title="Show Full Conversation"
          icon={Icon.Eye}
          target={<SessionDetail executable={executable} session={session} revalidate={revalidate} />}
        />
      ) : null}
      <Action.Push
        title="Rename Session"
        icon={Icon.Pencil}
        target={<RenameSessionForm executable={executable} session={session} />}
      />
      <Action
        title="Resume and Record Session"
        icon={Icon.Video}
        onAction={() => openSession(executable, session, "record")}
      />
      <Action
        title="Recover Session Copy"
        icon={Icon.RotateAntiClockwise}
        onAction={() => recoverSession(executable, session, revalidate)}
      />
      <Action
        title="Inspect Session in Terminal"
        icon={Icon.Code}
        onAction={() => openSession(executable, session, "inspect")}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
        <Action.CopyToClipboard title="Copy Resume Command" content={resumeCommand} />
        <Action.ShowInFinder title="Show Workspace in Finder" path={session.workspace_root} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh Session Data"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
        <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        <Action.OpenInBrowser title="Open Fx Sessions Documentation" url="https://fx.sh/docs/using-fx/sessions" />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const { fxPath: executable } = getFxPreferences();
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    (fxExecutable: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const args = ["sessions", "--all", "--json", "--limit", String(PAGE_SIZE)];
        if (cursor) args.push("--cursor", cursor);
        const response = parseSessions(await runFxJson<FxSessionsResponse>(fxExecutable, args));
        return {
          data: response.sessions,
          hasMore: response.has_more === true,
          cursor: response.next_cursor,
        };
      },
    [executable],
    { failureToastOptions: { title: "Could Not Load fx Sessions" } },
  );

  const sessions = data || [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={sessions.length > 0}
      pagination={pagination}
      searchBarPlaceholder="Search by title, message preview, workspace, or ID…"
    >
      {!isLoading && error ? (
        <List.EmptyView
          title={isFxNotInstalled(error) ? "fx Is Not Installed" : "Could Not Load fx Sessions"}
          description={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={<FxErrorActions error={error} retry={revalidate} />}
        />
      ) : !isLoading && sessions.length === 0 ? (
        <List.EmptyView
          title="No fx Sessions Found"
          description="Start an interactive session with fx, then refresh this command."
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <Action title="Refresh Sessions" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Fx Sessions Documentation" url="https://fx.sh/docs/using-fx/sessions" />
            </ActionPanel>
          }
        />
      ) : (
        sessions.map((session) => (
          <List.Item
            key={session.id}
            icon={{ source: Icon.Message, tintColor: Color.Purple }}
            title={session.title || "Untitled Session"}
            subtitle={workspaceName(session.workspace_root)}
            keywords={[session.id, session.preview || "", session.workspace_root, session.conversation_language || ""]}
            accessories={[
              { text: `${session.history_len} ${session.history_len === 1 ? "turn" : "turns"}` },
              { date: new Date(session.updated_at_ms) },
            ]}
            detail={<SessionListDetail executable={executable} session={session} />}
            actions={<SessionActions executable={executable} session={session} revalidate={revalidate} />}
          />
        ))
      )}
    </List>
  );
}
