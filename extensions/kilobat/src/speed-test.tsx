import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Live, Phase, speedCard, WIDE } from "./cards";
import { ErrorView, KilobatAppAction, MissingCLI } from "./components";
import { image } from "./draw";
import { Conditions, kilobat, kilobatStreaming, MissingCLIError, SpeedTest } from "./kilobat";

type Options = { parallel: boolean; budgetMB?: number };
type State =
  | { kind: "checking" }
  | { kind: "metered" }
  | { kind: "running"; live: Live; options: Options }
  | { kind: "done"; live: Live; result: SpeedTest; options: Options }
  | { kind: "failed"; error: Error; options?: Options };

type Update = { phase: Phase; fraction: number; mbps?: number };

/** One `--progress` line from stderr; the CLI's plain progress text in between is skipped. */
function parse(line: string): Update | undefined {
  if (!line.startsWith("{")) return undefined;
  try {
    return JSON.parse(line) as Update;
  } catch {
    return undefined;
  }
}

const fresh = (): Live => ({ phase: "latency", fraction: 0, elapsed: 0, down: [], up: [] });

export default function Command() {
  const [state, setState] = useState<State>({ kind: "checking" });
  const run = useRef(0);
  const started = useRef(0);
  const current = useRef<AbortController | undefined>(undefined);

  const start = useCallback((options: Options) => {
    // One test at a time: stop the one running so two never share the line or the data limit.
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const id = ++run.current;
    started.current = Date.now();
    setState({ kind: "running", live: fresh(), options });
    const args = [
      "speedtest",
      "--json",
      "--progress",
      ...(options.parallel ? ["--parallel"] : []),
      ...(options.budgetMB ? ["--budget-mb", String(options.budgetMB)] : []),
    ];
    kilobatStreaming<SpeedTest>(
      args,
      (line) => {
        const update = parse(line);
        if (!update || run.current !== id) return;
        setState((previous) => {
          if (previous.kind !== "running") return previous;
          const live = { ...previous.live, phase: update.phase, fraction: update.fraction };
          if (update.mbps != null && update.phase === "download") live.down = [...live.down, update.mbps];
          if (update.mbps != null && update.phase === "upload") live.up = [...live.up, update.mbps];
          return { ...previous, live };
        });
      },
      { signal: controller.signal },
    )
      .then((result) => {
        if (run.current !== id) return;
        setState((previous) => ({
          kind: "done",
          result,
          options,
          live: previous.kind === "running" ? previous.live : fresh(),
        }));
      })
      .catch((error: Error) => {
        if (run.current !== id) return;
        setState({ kind: "failed", error, options });
      });
  }, []);

  // Look for a metered network first, so a test never spends 80 MB of someone's hotspot unasked.
  const check = useCallback(() => {
    setState({ kind: "checking" });
    kilobat<Conditions>(["conditions", "--json"])
      .then((conditions) => (conditions.metered ? setState({ kind: "metered" }) : start({ parallel: false })))
      .catch((error: Error) => setState({ kind: "failed", error }));
  }, [start]);

  useEffect(() => {
    check();
    return () => current.current?.abort();
  }, []);

  // The elapsed seconds beside the phase.
  useEffect(() => {
    if (state.kind !== "running") return;
    const timer = setInterval(
      () =>
        setState((previous) =>
          previous.kind === "running"
            ? { ...previous, live: { ...previous.live, elapsed: (Date.now() - started.current) / 1000 } }
            : previous,
        ),
      500,
    );
    return () => clearInterval(timer);
  }, [state.kind]);

  if (state.kind === "failed") {
    if (state.error instanceof MissingCLIError) return <MissingCLI />;
    // Retry the same test, light limit included; if the metered check never finished, check again first.
    const failed = state.options;
    return <ErrorView error={state.error} onRetry={() => (failed ? start(failed) : check())} />;
  }

  const options = state.kind === "running" || state.kind === "done" ? state.options : { parallel: false };
  const lightTest = (
    <Action title="Run Light Test (10 MB)" icon={Icon.Gauge} onAction={() => start({ ...options, budgetMB: 10 })} />
  );

  if (state.kind === "metered") {
    return (
      <Detail
        navigationTitle="Speed Test"
        markdown={image(speedCard(undefined, undefined, true), WIDE, "Metered network")}
        actions={
          <ActionPanel>
            {lightTest}
            <Action title="Run Full Test (80 MB)" icon={Icon.Gauge} onAction={() => start({ parallel: false })} />
          </ActionPanel>
        }
      />
    );
  }

  const live = state.kind === "running" || state.kind === "done" ? state.live : undefined;
  const result = state.kind === "done" ? state.result : undefined;
  const m = result?.measurements;
  const summary = result
    ? `Download ${m?.downloadMbps?.toFixed(1)} Mbps · Upload ${m?.uploadMbps?.toFixed(1)} Mbps · latency under load ${result.bufferbloat} · video calls ${result.videoCalls} · measured with Kilobat (kilobat.app)`
    : "";

  return (
    <Detail
      isLoading={state.kind !== "done"}
      navigationTitle="Speed Test"
      markdown={image(speedCard(live, result), WIDE, "Speed test")}
      actions={
        <ActionPanel>
          {result ? <Action.CopyToClipboard title="Copy Result" content={summary} /> : null}
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => start(options)}
          />
          <Action
            title={options.parallel ? "Run with One Connection" : "Run with Four Connections"}
            icon={Icon.Gauge}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => start({ ...options, parallel: !options.parallel })}
          />
          {lightTest}
          <KilobatAppAction title="Share a Card from Kilobat" link="share/speed" />
        </ActionPanel>
      }
    />
  );
}
