import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, Toast, showToast } from "@raycast/api";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ClaudeScopeError,
  LiveFinished,
  LiveResponse,
  LiveSession,
  LiveSessionMeta,
  listLiveSessions,
  startClaudeScope,
} from "./lib/claudescope";
import {
  contextText,
  costText,
  costTooltip,
  detailMarkdown,
  finishedLabel,
  formatElapsed,
  groupLiveSessions,
  isPossiblyStuck,
  stateLabel,
  stuckTooltip,
  toolInputText,
} from "./lib/live";
import { ErrorView, agentTag, formatCost, formatTokens, openWithFeedback } from "./lib/ui";

const POLL_INTERVAL_MS = 5_000;
const TICK_INTERVAL_MS = 1_000;
const ALL_AGENTS = "all";

interface LiveViewState {
  response?: LiveResponse;
  updatedAt?: number;
  error?: Error;
  loading: boolean;
}

function isNotRunning(error?: Error): boolean {
  return error instanceof ClaudeScopeError && error.kind === "not-running";
}

// These need the user to act (install, fix the path, update); polling would
// only re-run executable discovery and the version check every few seconds.
function needsUserAction(error: unknown): boolean {
  return error instanceof ClaudeScopeError && (error.kind === "missing" || error.kind === "incompatible");
}

function sessionIcon(session: LiveSession, now: number): Image.ImageLike {
  if (isPossiblyStuck(session, now)) return { source: Icon.Warning, tintColor: Color.Orange };
  switch (session.state) {
    case "idle":
      return { source: Icon.Pause, tintColor: Color.Yellow };
    case "working":
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
    case "tool":
      return { source: Icon.Hammer, tintColor: Color.Blue };
    case "subagents":
      return { source: Icon.TwoPeople, tintColor: Color.Blue };
    case "ended":
      return { source: Icon.Stop, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
}

function SessionDetail({ meta, usageGranularity, session, now }: DetailProps) {
  const context = contextText(meta, formatTokens);
  const agent = agentTag(meta.connectorId);
  return (
    <List.Item.Detail
      markdown={session ? detailMarkdown(session, now) : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Agent">
            <List.Item.Detail.Metadata.TagList.Item text={agent.value} color={agent.color} />
          </List.Item.Detail.Metadata.TagList>
          {meta.projectDisplayName ? (
            <List.Item.Detail.Metadata.Label title="Project" text={meta.projectDisplayName} />
          ) : null}
          {meta.gitBranch ? <List.Item.Detail.Metadata.Label title="Branch" text={meta.gitBranch} /> : null}
          {meta.models.length > 0 ? (
            <List.Item.Detail.Metadata.Label title="Model" text={meta.models.join(", ")} />
          ) : null}
          {context ? <List.Item.Detail.Metadata.Label title="Context" text={context} /> : null}
          {meta.compactionCount !== undefined ? (
            <List.Item.Detail.Metadata.Label title="Compactions" text={String(meta.compactionCount)} />
          ) : null}
          {session?.state === "tool" && session.openTool ? (
            <List.Item.Detail.Metadata.Label title="Tool" text={session.openTool.name} />
          ) : null}
          {session?.toolErrors !== undefined ? (
            <List.Item.Detail.Metadata.Label title="Tool Errors" text={String(session.toolErrors)} />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Cost"
            text={costText(meta.totalCostUsd, usageGranularity, !session || session.state === "ended", formatCost)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface DetailProps {
  meta: LiveSessionMeta;
  usageGranularity: string;
  session?: LiveSession;
  now: number;
}

export default function Command() {
  const [state, setState] = useState<LiveViewState>({ loading: true });
  const [now, setNow] = useState(() => Date.now());
  const [showingDetail, setShowingDetail] = useState(false);
  const [agent, setAgent] = useState(ALL_AGENTS);
  const inFlight = useRef<AbortController | undefined>(undefined);
  const paused = useRef(false);
  const tickEvery = useRef(Number.POSITIVE_INFINITY);

  const poll = useCallback(async (manual = false) => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    if (manual) setState((previous) => ({ ...previous, loading: true }));
    try {
      const response = await listLiveSessions(controller.signal);
      if (!controller.signal.aborted) {
        setNow(Date.now());
        setState({ response, updatedAt: Date.now(), loading: false });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      paused.current = needsUserAction(error);
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error(String(error)),
        loading: false,
      }));
    } finally {
      if (inFlight.current === controller) inFlight.current = undefined;
    }
  }, []);

  const refresh = useCallback(() => {
    paused.current = false;
    void poll(true);
  }, [poll]);

  useEffect(() => {
    void poll();
    const timer = setInterval(() => {
      if (!paused.current) void poll();
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      inFlight.current?.abort();
      inFlight.current = undefined;
    };
  }, [poll]);

  useEffect(() => {
    const timer = setInterval(
      () => setNow((previous) => (Date.now() - previous >= tickEvery.current ? Date.now() : previous)),
      TICK_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, []);

  const start = useCallback(async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting ClaudeScope…" });
    try {
      await startClaudeScope();
      toast.style = Toast.Style.Success;
      toast.title = "ClaudeScope started";
      refresh();
    } catch (error) {
      const claudeScopeError = error instanceof ClaudeScopeError ? error : undefined;
      toast.style = Toast.Style.Failure;
      toast.title = claudeScopeError?.message ?? "Could Not Start ClaudeScope";
      toast.message = claudeScopeError?.detail ?? (error instanceof Error ? error.message : String(error));
    }
  }, [refresh]);

  const { response, updatedAt, error } = state;
  // While polls fail the list is a snapshot: judge "stuck" at the time it was
  // taken, or every working row turns orange after three minutes of no updates.
  const observedAt = error && updatedAt !== undefined ? updatedAt : now;
  const notRunning = isNotRunning(error);
  // Raycast flags a command that re-renders an unchanged tree, so the clock only
  // advances as often as some visible text can change: every second while a
  // seconds counter is on screen, every ten for minute-level labels, never
  // while there is nothing timed to show.
  const showsSeconds =
    (error !== undefined && updatedAt !== undefined) ||
    (response?.sessions.some((session) => now - (session.stateSinceMs ?? session.lastWriteMs) < 60_000) ?? false);
  tickEvery.current = !response ? Number.POSITIVE_INFINITY : showsSeconds ? TICK_INTERVAL_MS : 10_000;
  const selectedAgent = agent === ALL_AGENTS ? undefined : agent;
  const sections = response ? groupLiveSessions(response, selectedAgent) : undefined;
  const allSections = response ? groupLiveSessions(response) : undefined;
  const hasAnySession =
    allSections !== undefined &&
    allSections.idle.length + allSections.working.length + allSections.other.length + allSections.finished.length > 0;
  const agents = response
    ? [
        ...new Set([
          ...response.sessions.map((session) => session.meta.connectorId),
          ...response.finished.map((finished) => finished.meta.connectorId),
          // Keep a selected agent listed after its sessions leave the window.
          ...(selectedAgent ? [selectedAgent] : []),
        ]),
      ].sort((left, right) => agentTag(left).value.localeCompare(agentTag(right).value))
    : [];

  const staleTitle =
    error && updatedAt !== undefined
      ? notRunning
        ? "Not updating — ClaudeScope is not running"
        : `Not updating — last update ${formatElapsed(now - updatedAt)} ago`
      : undefined;

  const truncatedNote = response && response.truncated > 0 ? `+${response.truncated} more not shown` : undefined;
  const truncatedSection = sections
    ? sections.working.length > 0
      ? "working"
      : sections.idle.length > 0
        ? "idle"
        : sections.other.length > 0
          ? "other"
          : undefined
    : undefined;

  function rowActions(meta: LiveSessionMeta, session?: LiveSession) {
    return (
      <ActionPanel>
        <Action title="Open Session in ClaudeScope" icon={Icon.ArrowRight} onAction={() => openWithFeedback(meta.id)} />
        <Action
          title="Toggle Detail"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => setShowingDetail((value) => !value)}
        />
        <Action.CopyToClipboard title="Copy Session ID" content={meta.id} />
        {session?.openTool ? (
          <Action.CopyToClipboard title="Copy Tool Input" content={toolInputText(session.openTool.input)} />
        ) : null}
        {notRunning ? <Action title="Start ClaudeScope" icon={Icon.Play} onAction={start} /> : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
        <Action
          title="Open ClaudeScope"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={() => openWithFeedback()}
        />
      </ActionPanel>
    );
  }

  function sessionItem(session: LiveSession) {
    const { meta } = session;
    const stuck = isPossiblyStuck(session, observedAt);
    const label = stateLabel(session, now);
    return (
      <List.Item
        key={meta.id}
        id={meta.id}
        icon={sessionIcon(session, observedAt)}
        title={meta.title || "Untitled Session"}
        subtitle={showingDetail ? undefined : meta.projectDisplayName}
        keywords={[meta.id, meta.projectId, meta.connectorId]}
        accessories={
          showingDetail
            ? undefined
            : [
                { tag: agentTag(meta.connectorId) },
                stuck
                  ? { text: { value: label, color: Color.Orange }, tooltip: stuckTooltip(session, observedAt) }
                  : { text: label },
                ...(session.subagents.running > 0
                  ? [
                      {
                        icon: Icon.TwoPeople,
                        text: String(session.subagents.running),
                        tooltip: `${session.subagents.running} subagents running`,
                      },
                    ]
                  : []),
                {
                  text: costText(meta.totalCostUsd, session.usageGranularity, session.state === "ended", formatCost),
                  tooltip: costTooltip(session.usageGranularity, session.state === "ended"),
                },
              ]
        }
        detail={
          showingDetail ? (
            <SessionDetail meta={meta} usageGranularity={session.usageGranularity} session={session} now={now} />
          ) : undefined
        }
        actions={rowActions(meta, session)}
      />
    );
  }

  function finishedItem(finished: LiveFinished) {
    const { meta } = finished;
    return (
      <List.Item
        key={meta.id}
        id={meta.id}
        icon={{ source: Icon.CheckCircle, tintColor: Color.SecondaryText }}
        title={meta.title || "Untitled Session"}
        subtitle={showingDetail ? undefined : meta.projectDisplayName}
        keywords={[meta.id, meta.projectId, meta.connectorId]}
        accessories={
          showingDetail
            ? undefined
            : [
                { tag: agentTag(meta.connectorId) },
                { text: finishedLabel(finished, now), tooltip: "Last transcript write" },
                {
                  text: costText(meta.totalCostUsd, finished.usageGranularity, true, formatCost),
                  tooltip: costTooltip(finished.usageGranularity, true),
                },
              ]
        }
        detail={
          showingDetail ? (
            <SessionDetail meta={meta} usageGranularity={finished.usageGranularity} now={now} />
          ) : undefined
        }
        actions={rowActions(meta)}
      />
    );
  }

  let content: ReactNode;
  if (error && (notRunning ? !hasAnySession : response === undefined)) {
    content = notRunning ? (
      <List.EmptyView
        icon={Icon.Power}
        title="ClaudeScope Is Not Running"
        description="Start ClaudeScope to see live coding-agent sessions. This view updates once it is up."
        actions={
          <ActionPanel>
            <Action title="Start ClaudeScope" icon={Icon.Play} onAction={start} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
    ) : (
      <ErrorView error={error} retry={refresh} />
    );
  } else if (!sections) {
    content = null;
  } else if (sections.idle.length + sections.working.length + sections.other.length + sections.finished.length === 0) {
    content = (
      <List.EmptyView
        icon={Icon.Terminal}
        title="No Live Sessions"
        description={`No coding-agent session wrote to its transcript in the last ${response?.windowMinutes ?? 15} minutes.`}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
            <Action
              title="Open ClaudeScope"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onAction={() => openWithFeedback()}
            />
          </ActionPanel>
        }
      />
    );
  } else {
    content = (
      <>
        {sections.idle.length > 0 ? (
          <List.Section
            title="Idle — waiting for you"
            subtitle={truncatedSection === "idle" ? truncatedNote : undefined}
          >
            {sections.idle.map(sessionItem)}
          </List.Section>
        ) : null}
        {sections.working.length > 0 ? (
          <List.Section title="Working" subtitle={truncatedSection === "working" ? truncatedNote : undefined}>
            {sections.working.map(sessionItem)}
          </List.Section>
        ) : null}
        {sections.other.length > 0 ? (
          <List.Section title="Other" subtitle={truncatedSection === "other" ? truncatedNote : undefined}>
            {sections.other.map(sessionItem)}
          </List.Section>
        ) : null}
        {sections.finished.length > 0 ? (
          <List.Section title="Finished recently">{sections.finished.map(finishedItem)}</List.Section>
        ) : null}
      </>
    );
  }

  return (
    <List
      isLoading={state.loading}
      isShowingDetail={showingDetail && hasAnySession}
      navigationTitle={staleTitle}
      searchBarPlaceholder="Filter live sessions…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Agent" value={agent} onChange={setAgent}>
          <List.Dropdown.Item title="All Agents" value={ALL_AGENTS} />
          {agents.map((connectorId) => (
            <List.Dropdown.Item key={connectorId} title={agentTag(connectorId).value} value={connectorId} />
          ))}
        </List.Dropdown>
      }
    >
      {content}
    </List>
  );
}
