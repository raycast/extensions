import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { credentials } from "../lib/preferences";
import { formatCost, getWorkflowRun, WiroError } from "../lib/wiro";
import { isRunFinished, runOutputs, runProgress, type WorkflowInfo } from "../lib/workflow";
import { OutputListItem } from "./output-item";

const MAX_POLL_FAILURES = 5;

function isPermanent(error: unknown): boolean {
  // 408 and 429 pass with time, so they do not stop the polling.
  return (
    error instanceof WiroError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

/** Follows a workflow run until it ends, then lists what its End step returns. */
export function WorkflowRun({ workflow, token }: { workflow: WorkflowInfo; token: string }) {
  const [state, setState] = useState<{ run: Record<string, unknown>; nodes: Array<Record<string, unknown>> }>();
  const [pollError, setPollError] = useState<Error>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const toastRef = useRef<Toast | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);

    const finish = (status: string | undefined, error?: Error) => {
      clearInterval(ticker);
      const toast = toastRef.current;
      if (!toast) return;
      toast.style = status === "completed" ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = status === "completed" ? "Workflow finished" : `Workflow ${status ?? "stopped"}`;
      toast.message = error?.message;
    };

    const poll = async () => {
      try {
        const current = await getWorkflowRun(token, credentials(), controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        setState(current);
        if (isRunFinished(current.run.status)) {
          finish(String(current.run.status));
          return;
        }
        const progress = runProgress(current.run, current.nodes);
        if (toastRef.current) toastRef.current.message = `${progress.done} of ${progress.total || "?"} steps done`;
      } catch (error) {
        if (controller.signal.aborted) return;
        failures += 1;
        if (isPermanent(error) || failures >= MAX_POLL_FAILURES) {
          const reason = error instanceof Error ? error : new Error(String(error));
          setPollError(reason);
          finish(undefined, reason);
          return;
        }
      }
      const elapsed = Date.now() - startedAt;
      timer = setTimeout(poll, elapsed < 30_000 ? 3_000 : elapsed < 120_000 ? 5_000 : 10_000);
    };

    // The first poll waits for the toast, so the toast always gets the final status.
    showToast({ style: Toast.Style.Animated, title: `Running ${workflow.title}` }).then((toast) => {
      if (controller.signal.aborted) {
        toast.hide();
        return;
      }
      toastRef.current = toast;
      poll();
    });

    return () => {
      controller.abort();
      clearTimeout(timer);
      clearInterval(ticker);
      if (toastRef.current?.style === Toast.Style.Animated) toastRef.current.hide();
    };
  }, [token]);

  const progress = state ? runProgress(state.run, state.nodes) : undefined;
  const finished = progress ? isRunFinished(progress.status) : false;
  const outputs = finished && state ? runOutputs(state.run.contents ?? workflow.contents, state.nodes) : [];
  const anyOutput = outputs.some((output) => output.items.length > 0);
  const group = `workflow-${token.slice(0, 16)}`;
  const cost =
    finished && state ? formatCost((state.run.chargedcost ?? state.run.totalcost) as string | undefined) : undefined;

  const metadataRows = (
    <>
      <List.Item.Detail.Metadata.Link title="Workflow" text={workflow.title} target={workflow.url} />
      <List.Item.Detail.Metadata.Label title="Status" text={pollError ? "Unknown" : (progress?.status ?? "starting")} />
      {progress && (
        <List.Item.Detail.Metadata.Label title="Steps Done" text={`${progress.done} of ${progress.total}`} />
      )}
      {cost && <List.Item.Detail.Metadata.Label title="Cost" text={cost} />}
    </>
  );
  const metadata = <List.Item.Detail.Metadata>{metadataRows}</List.Item.Detail.Metadata>;
  const commonActions = <Action.OpenInBrowser title="Open Workflow Page" icon={Icon.Globe} url={workflow.url} />;

  let statusItem: { title: string; subtitle?: string; icon: Icon; markdown: string } | undefined;
  if (pollError) {
    statusItem = {
      title: "Could not follow the run",
      icon: Icon.Warning,
      markdown: `## Could not follow the run\n\n${pollError.message}\n\nThe run may still finish. It shows up in your workflow history on wiro.ai.`,
    };
  } else if (!finished) {
    statusItem = {
      title: progress ? `${progress.done} of ${progress.total || "?"} steps done` : "Starting",
      subtitle: `${Math.floor(elapsedMs / 1000)} s`,
      icon: Icon.CircleProgress,
      markdown: `## Running ${workflow.title}\n\nEach step runs its model and is charged at that model's price. Closing this view does not stop the run.`,
    };
  } else if (progress?.status !== "completed") {
    statusItem = {
      title: `Run ${progress?.status ?? "stopped"}`,
      icon: Icon.XMarkCircle,
      markdown: `## The run ${progress?.status ?? "stopped"}\n\n${progress?.failedSteps ?? 0} step(s) did not finish. Open the workflow on wiro.ai to see each step.`,
    };
  } else if (!anyOutput) {
    statusItem = {
      title: "No output",
      icon: Icon.QuestionMarkCircle,
      markdown: "## The run finished without an output\n\nThe workflow's End step returns nothing.",
    };
  }

  return (
    <List isLoading={!finished && !pollError} isShowingDetail navigationTitle={workflow.title}>
      {statusItem && (
        <List.Item
          icon={statusItem.icon}
          title={statusItem.title}
          subtitle={statusItem.subtitle}
          detail={<List.Item.Detail markdown={statusItem.markdown} metadata={metadata} />}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {outputs
        .filter((output) => output.items.length > 0)
        .map((output) => (
          <List.Section key={output.field} title={output.field}>
            {output.items.map((item) => (
              <OutputListItem
                key={item.id}
                item={item}
                group={group}
                metadata={metadataRows}
                extraActions={commonActions}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
