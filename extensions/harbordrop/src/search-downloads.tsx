import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { findHarborDrop, openHarborDrop } from "./lib/app";
import { CommandScheduler } from "./lib/command-scheduler";
import {
  Action as BridgeAction,
  AppVerificationSession,
  DownloadTask,
  TASK_STATES,
  requireReady,
  retainVisibleState,
} from "./lib/contract";
import {
  IntegrationError,
  isAppVerificationFailure,
  safeMessage,
} from "./lib/errors";
import { downloadProgress, isDownloading } from "./lib/download-presentation";
import {
  forgetUnpublished,
  loadTrackedRequests,
  savePending,
} from "./lib/pending";
import { requestPresentation, TrackedRequest } from "./lib/request-tracking";
import {
  PendingRequest,
  SharedState,
  loadSharedState,
  makeRequest,
  pendingReference,
  submitRequest,
  wakeURL,
} from "./lib/transport";
import { OpenAppAction, RequestStatus, showFailure } from "./lib/ui";

const STATE_LABELS: Record<string, string> = {
  pending: "Waiting",
  downloading: "Downloading",
  paused: "Paused",
  merging: "Merging",
  completed: "Completed",
  error: "Needs Attention",
  cancelled: "Cancelled",
};
export default function Command() {
  const [state, setState] = useState<SharedState>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<TrackedRequest[]>([]);
  const mounted = useRef(true);
  const generation = useRef(0);
  const lifecycleGeneration = useRef(0);
  const scheduler = useRef(new CommandScheduler());
  const reviewing = useRef(false);
  const lastSharedValue = useRef("");
  const lastPendingValue = useRef("");
  const sending = useRef<{ mount: number } | null>(null);
  const appVerification = useRef(new AppVerificationSession());
  const lifetime = useRef<AbortController | null>(null);
  const handleVerificationFailure = useCallback((error: IntegrationError) => {
    appVerification.current.invalidate();
    generation.current += 1;
    lastSharedValue.current = "";
    if (mounted.current) {
      setState(undefined);
      setError(safeMessage(error));
      setLoading(false);
    }
  }, []);
  const { push } = useNavigation();
  const performRefresh = useCallback(async (showLoading: boolean) => {
    const mount = lifecycleGeneration.current;
    if (
      reviewing.current ||
      (!showLoading && !appVerification.current.canPoll())
    )
      return;
    const current = ++generation.current;
    const signal = lifetime.current?.signal;
    if (showLoading) setLoading(true);
    try {
      const [shared, requests] = await Promise.allSettled([
        (async () => {
          if (showLoading) {
            await appVerification.current.verify(() => findHarborDrop(signal));
          }
          const verifiedGeneration = appVerification.current.generation;
          const shared = await loadSharedState();
          if (!appVerification.current.accepts(verifiedGeneration))
            throw new IntegrationError("cancelled");
          return shared;
        })(),
        loadTrackedRequests(signal),
      ]);
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === generation.current
      ) {
        let nextError: string | undefined;
        if (requests.status === "fulfilled") {
          const value = JSON.stringify(requests.value);
          if (value !== lastPendingValue.current) {
            lastPendingValue.current = value;
            setPending(requests.value);
          }
        }
        if (shared.status === "fulfilled") {
          const value = JSON.stringify(shared.value);
          if (value !== lastSharedValue.current) {
            lastSharedValue.current = value;
            setState(shared.value);
          }
          try {
            requireReady(shared.value.descriptor, shared.value.snapshot);
          } catch (value) {
            nextError = safeMessage(value);
          }
        }
        if (shared.status === "rejected") {
          nextError = safeMessage(shared.reason);
          setState((previous) => {
            const visible = retainVisibleState(previous, shared.reason);
            if (!visible) lastSharedValue.current = "";
            return visible;
          });
        } else if (!nextError && requests.status === "rejected")
          nextError = safeMessage(requests.reason);
        setError(nextError);
      }
    } catch (value) {
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === generation.current
      ) {
        setState((previous) => {
          const visible = retainVisibleState(previous, value);
          if (!visible) lastSharedValue.current = "";
          return visible;
        });
        setError(safeMessage(value));
      }
    } finally {
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === generation.current
      )
        setLoading(false);
    }
  }, []);
  const refresh = useCallback(
    async (showLoading = true) => {
      const mount = lifecycleGeneration.current;
      try {
        await scheduler.current.refresh(showLoading, () =>
          performRefresh(showLoading),
        );
      } catch (value) {
        if (mounted.current && mount === lifecycleGeneration.current) {
          setError(safeMessage(value));
        }
      }
    },
    [performRefresh],
  );
  useEffect(() => {
    const mount = ++lifecycleGeneration.current;
    const controller = new AbortController();
    const operations = new CommandScheduler();
    scheduler.current = operations;
    setBusy(false);
    mounted.current = true;
    lifetime.current = controller;
    void refresh();
    const timer = setInterval(() => {
      if (mount === lifecycleGeneration.current) void refresh(false);
    }, 2000);
    return () => {
      controller.abort();
      operations.dispose();
      clearInterval(timer);
      if (mount !== lifecycleGeneration.current) return;
      mounted.current = false;
      lifecycleGeneration.current += 1;
      generation.current += 1;
      appVerification.current.invalidate();
      if (sending.current?.mount === mount) sending.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    const validUntil = state?.snapshot.access?.validUntil;
    if (validUntil === undefined) return;
    const timer = setTimeout(
      () => {
        if (!mounted.current || validUntil > Date.now() / 1000) return;
        generation.current += 1;
        lastSharedValue.current = "";
        setState(undefined);
        setError(safeMessage(new IntegrationError("accessExpired")));
      },
      Math.min(Math.max(0, validUntil * 1000 - Date.now()), 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [state]);
  const visibleState = retainVisibleState(state);
  const issue = error;
  function showRequest(request: PendingRequest) {
    reviewing.current = true;
    // Raycast keeps the underlying list mounted while a detail view is pushed.
    generation.current += 1;
    push(
      <RequestStatus
        pending={request}
        onVerificationFailure={handleVerificationFailure}
      />,
      () => {
        reviewing.current = false;
        void refresh();
      },
    );
  }
  async function send(action: BridgeAction, task: DownloadTask) {
    if (sending.current) return;
    const owner = { mount: lifecycleGeneration.current };
    const signal = lifetime.current?.signal;
    const isCurrent = () =>
      mounted.current &&
      owner.mount === lifecycleGeneration.current &&
      !signal?.aborted;
    sending.current = owner;
    setBusy(true);
    try {
      await scheduler.current.action(async () => {
        if (!isCurrent()) return;
        try {
          generation.current += 1;
          const app = await appVerification.current.verify(() =>
            findHarborDrop(signal),
          );
          const request = makeRequest(await loadSharedState(), action, {
            task,
          });
          const reference = pendingReference(request);
          await savePending(reference);
          try {
            await submitRequest(request, app, { signal });
          } catch (value) {
            await forgetUnpublished(reference, value);
            throw value;
          }
          try {
            await openHarborDrop(wakeURL(reference.requestID), app, signal);
          } catch (value) {
            if (isCurrent()) {
              if (isAppVerificationFailure(value)) {
                handleVerificationFailure(value);
              }
              await showFailure(value);
            }
          }
          if (isCurrent()) showRequest(reference);
        } catch (value) {
          if (isCurrent()) {
            generation.current += 1;
            if (isAppVerificationFailure(value))
              handleVerificationFailure(value);
            setState((previous) => {
              const visible = retainVisibleState(previous, value);
              if (!visible) lastSharedValue.current = "";
              return visible;
            });
            setError(safeMessage(value));
            await showFailure(value);
          }
        }
      });
    } catch (value) {
      if (isCurrent()) await showFailure(value);
    } finally {
      if (sending.current === owner) {
        sending.current = null;
        if (isCurrent()) setBusy(false);
      }
    }
  }
  const generalActions = (
    <>
      <OpenAppAction onVerificationFailure={handleVerificationFailure} />
      <Action
        title="Refresh Shared State"
        icon={Icon.ArrowClockwise}
        onAction={() => refresh()}
      />
    </>
  );
  const active = visibleState?.snapshot.tasks.filter(isDownloading) ?? [];
  const finishing =
    visibleState?.snapshot.tasks.filter((task) => task.state === "merging") ??
    [];
  const other =
    visibleState?.snapshot.tasks.filter(
      (task) => !isDownloading(task) && task.state !== "merging",
    ) ?? [];
  const activeCount = `${active.length}${visibleState?.snapshot.truncated ? "+" : ""}`;
  const renderTask = (task: DownloadTask) => {
    const known = TASK_STATES.includes(
      task.state as (typeof TASK_STATES)[number],
    );
    const can = (action: BridgeAction) =>
      !issue &&
      !loading &&
      !busy &&
      appVerification.current.canPoll() &&
      known &&
      visibleState?.snapshot.capabilities.includes(action) &&
      task.availableActions.includes(action);
    const progress = downloadProgress(task);
    return (
      <List.Item
        key={task.taskID}
        id={task.taskID}
        title={task.displayName}
        subtitle={`${STATE_LABELS[task.state] ?? "Unknown State"} · ${progress.bytes}`}
        icon={task.state === "completed" ? Icon.CheckCircle : Icon.Download}
        accessories={[
          ...(!issue && progress.speed ? [{ text: progress.speed }] : []),
          ...(progress.percentage ? [{ text: progress.percentage }] : []),
        ]}
        actions={
          <ActionPanel>
            {can("showTask") && (
              <Action
                title="Show in HarborDrop"
                icon={Icon.AppWindow}
                onAction={() => send("showTask", task)}
              />
            )}
            {can("revealTask") && (
              <Action
                title="Reveal in Finder"
                icon={Icon.Finder}
                onAction={() => send("revealTask", task)}
              />
            )}
            {generalActions}
          </ActionPanel>
        }
      />
    );
  };
  return (
    <List
      isLoading={loading || busy}
      navigationTitle={
        visibleState
          ? `Downloads · ${activeCount} Downloading${issue ? " (Last Shared)" : ""}`
          : "Downloads"
      }
      searchBarPlaceholder="Search download names"
      actions={<ActionPanel>{generalActions}</ActionPanel>}
    >
      {issue && (
        <List.Section title="Integration Status">
          <List.Item
            title={
              visibleState
                ? "Shared State Is Read-Only"
                : "Downloads Unavailable"
            }
            subtitle={issue}
            icon={Icon.ExclamationMark}
            actions={<ActionPanel>{generalActions}</ActionPanel>}
          />
        </List.Section>
      )}
      {visibleState && (
        <List.Section
          title={`${issue ? "Downloading (Last Shared)" : "Downloading"} · ${activeCount}`}
          subtitle={`${visibleState.snapshot.truncated ? "Shared portion only · " : ""}Updated ${new Date(visibleState.snapshot.generatedAt * 1000).toLocaleTimeString()}`}
        >
          {active.map(renderTask)}
          {!active.length && (
            <List.Item
              id="no-active-downloads"
              title={
                issue
                  ? "No Downloads in Progress in Last Shared State"
                  : "No Downloads in Progress"
              }
              subtitle={
                visibleState.snapshot.truncated
                  ? "Only part of the download list is shared"
                  : undefined
              }
              icon={Icon.Tray}
              actions={<ActionPanel>{generalActions}</ActionPanel>}
            />
          )}
        </List.Section>
      )}
      {!!finishing.length && (
        <List.Section
          title={`Finishing${issue ? " (Last Shared)" : ""} · ${finishing.length}${visibleState?.snapshot.truncated ? "+" : ""}`}
        >
          {finishing.map(renderTask)}
        </List.Section>
      )}
      {visibleState && (
        <List.Section
          title="Other Downloads"
          subtitle={
            visibleState?.snapshot.truncated
              ? `Showing ${visibleState.snapshot.tasks.length} of ${visibleState.snapshot.totalTaskCount}`
              : undefined
          }
        >
          {other.map(renderTask)}
        </List.Section>
      )}
      {!!pending.length && (
        <List.Section title="Requests to Check">
          {pending.map((item) => {
            const presentation = requestPresentation(item);
            const inProgress = [
              "accepted",
              "awaitingUser",
              "executing",
            ].includes(item.status);
            return (
              <List.Item
                key={item.requestID}
                id={`request-${item.requestID}`}
                title={presentation.title}
                subtitle={presentation.subtitle}
                icon={inProgress ? Icon.Clock : Icon.ExclamationMark}
                accessories={[{ date: new Date(item.createdAt * 1000) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Check Request Result"
                      onAction={() => showRequest(item)}
                    />
                    {generalActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {!loading &&
        !issue &&
        visibleState &&
        !visibleState.snapshot.tasks.length &&
        !pending.length && (
          <List.EmptyView
            title="No Shared Downloads"
            description="HarborDrop has no download tasks to share."
            icon={Icon.Tray}
          />
        )}
    </List>
  );
}
