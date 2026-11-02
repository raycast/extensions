import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Keyboard,
  openExtensionPreferences,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { resolveAgentBrowserExecutable } from "./lib/agent-browser";
import {
  clearBrowserSessionContext,
  getBrowserEnvironment,
  getBrowserSessionContexts,
  getRetainedBrowserSessionEnvironments,
} from "./lib/browser-session";
import { executeSessionCLI } from "./lib/session-cli";
import {
  actOnSession,
  listSessions,
  normalizeSessionUrl,
  cleanupClosedSession,
  closeSessionWithConfirmation,
  describeSessionTarget,
  Session,
  SessionRunner,
} from "./lib/sessions";

function createRunner(signal: AbortSignal): SessionRunner {
  const configured = getPreferenceValues<Preferences>().executablePath.trim();
  let executable: Promise<string> | undefined;
  return async (args, context) => {
    if (!configured) throw new Error("Set the Agent Browser Executable preference before managing sessions.");
    executable ??= resolveAgentBrowserExecutable(configured, signal);
    return executeSessionCLI(await executable, args, getBrowserEnvironment(context), signal);
  };
}

export default function ManageSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [failedSources, setFailedSources] = useState(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const busy = useRef(false);
  const { push } = useNavigation();

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setIsLoading(true);
    setError(undefined);
    try {
      const [contexts, retainedEnvironments] = await Promise.all([
        getBrowserSessionContexts(),
        getRetainedBrowserSessionEnvironments(),
      ]);
      request.signal.throwIfAborted();
      const result = await listSessions(contexts, createRunner(request.signal), request.signal, retainedEnvironments);
      setSessions(result.sessions);
      setFailedSources(result.failedSources);
    } catch (failure) {
      if (!request.signal.aborted) {
        setSessions([]);
        setFailedSources(0);
        setError(failure instanceof Error ? failure.message : "Could not list sessions.");
      }
    } finally {
      if (controller.current === request) {
        busy.current = false;
        if (!request.signal.aborted) setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [refresh]);

  async function closeSession(session: Session) {
    if (busy.current) return;
    busy.current = true;
    const request = new AbortController();
    controller.current = request;
    try {
      const run = createRunner(request.signal);
      const closed = await closeSessionWithConfirmation(
        session,
        async (target) => {
          const confirmed = await confirmAlert({
            title: `Close “${session.name}”?`,
            message: `${target}\n\nThis closes the session's browser and tabs. Unsaved work and transient state may be lost. CLI restore settings may save authentication state. Attached browsers follow the CLI's close behavior.`,
            primaryAction: { title: "Close Session", style: Alert.ActionStyle.Destructive },
          });
          if (confirmed && !request.signal.aborted) setIsLoading(true);
          return confirmed;
        },
        run,
        request.signal,
      );
      if (!closed) return;
      const contexts = await getBrowserSessionContexts();
      await cleanupClosedSession(session, contexts, run, clearBrowserSessionContext, request.signal);
      if (!request.signal.aborted) await showToast({ style: Toast.Style.Success, title: "Session Closed" });
    } catch (failure) {
      if (!request.signal.aborted)
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Finish Closing Session",
          message: failure instanceof Error ? failure.message : "Refresh before retrying.",
        });
    } finally {
      busy.current = false;
      if (!request.signal.aborted) await refresh();
    }
  }

  const refreshAction = (
    <Action
      title="Refresh Sessions"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search active CLI sessions" navigationTitle="Manage Sessions">
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Globe}
        title={error ? "Could Not Load Sessions" : "No Active CLI Sessions"}
        description={
          error ||
          "Open a session with Open in Agent Browser. Dia and Safari tabs are managed through the existing AI tools."
        }
        actions={
          <ActionPanel>
            {refreshAction}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {failedSources > 0 ? (
        <List.Item
          title="Some Session Directories Are Unavailable"
          subtitle="Refresh or check the CLI installation"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {refreshAction}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      {sessions.map((session) => (
        <List.Item
          key={session.id}
          title={session.name}
          subtitle={session.label}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Open URL in Session"
                icon={Icon.Link}
                onAction={() => {
                  if (!busy.current) push(<OpenSessionUrl session={session} onOpened={refresh} />);
                }}
              />
              <Action.CopyToClipboard title="Copy Session Name" content={session.name} />
              {refreshAction}
              <Action
                title="Close Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => closeSession(session)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function OpenSessionUrl({ session, onOpened }: { session: Session; onOpened: () => Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined);
  const { pop } = useNavigation();
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(values: { url: string }) {
    if (controller.current) return;
    try {
      normalizeSessionUrl(values.url);
    } catch {
      setUrlError("Enter an HTTP or HTTPS URL without embedded credentials.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setIsLoading(true);
    try {
      await actOnSession(session, { type: "open", url: values.url }, createRunner(request.signal), request.signal);
      if (request.signal.aborted) return;
      await showToast({ style: Toast.Style.Success, title: "URL Opened in Session" });
      pop();
      void onOpened();
    } catch (failure) {
      if (!request.signal.aborted)
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Open URL",
          message: failure instanceof Error ? failure.message : "Refresh and retry.",
        });
    } finally {
      if (!request.signal.aborted) {
        controller.current = undefined;
        setIsLoading(false);
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Open in ${session.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open URL in Session" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Session and Source" text={describeSessionTarget(session)} />
      <Form.Description text="Opens this URL in the session's current tab. This may replace the current page. Existing browser visibility is preserved." />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        error={urlError}
        onChange={() => setUrlError(undefined)}
        autoFocus
      />
    </Form>
  );
}
