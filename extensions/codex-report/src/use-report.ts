import { Cache, Toast, environment, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import { cliErrorMessage } from "./cli-error";
import { createReportCache } from "./report-cache";
import { AgentSelection, Report } from "./report-data";
import { serial } from "./serial";

const snapshots = createReportCache(new Cache({ namespace: "reports-v1" }));
// One CLI run at a time: a cold scan takes about a minute, and killing it on every switch would discard the cache it builds.
const enqueue = serial();
// Bumped on refresh; scans started before it finish but must not refill the cleared caches.
let generation = 0;

/** Runs the bundled CLI on Raycast's own Node runtime, so it needs no separate installation. */
function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(environment.assetsPath, "codex-report.mjs"), ...args],
      { maxBuffer: 16 * 1024 * 1024, timeout: 600_000 },
      (failure, stdout, stderr) => {
        if (!failure) resolve(stdout);
        else reject(new Error(failure.killed ? "Report timed out. Please try again." : cliErrorMessage(stderr)));
      },
    );
  });
}

type ReportState = { key: string; report?: Report; loading: boolean; error?: string };

/** `section` limits the CLI's slow git/skill lookups to what the command shows; without `to` the CLI reports through today. */
export function useReport(
  from: string,
  to: string | undefined,
  agent: AgentSelection,
  section: "activity" | "repositories",
) {
  const reports = useRef(new Map<string, Report>());
  const [revision, setRevision] = useState(0);
  const key = `${from}:${to ?? "today"}:${agent}:${section}`;
  const [state, setState] = useState<ReportState>(() => ({ key, report: snapshots.read(key), loading: true }));

  useEffect(() => {
    const cached = reports.current.get(key);
    if (cached) {
      setState({ key, report: cached, loading: false });
      return;
    }
    let cancelled = false;
    const startedIn = generation;
    setState((current) => ({ key, report: current.key === key ? current.report : snapshots.read(key), loading: true }));
    void enqueue(async () => {
      // Reports superseded while waiting never start; a running one finishes, so its result and cache are kept.
      if (cancelled) return;
      try {
        const args = [
          "--agent",
          agent,
          "--global",
          "--json",
          `--${section}`,
          "--from",
          from,
          ...(to ? ["--to", to] : []),
        ];
        const report = JSON.parse(await runCli(args)) as Report;
        if (report.schemaVersion !== 1) throw new Error("Unsupported report format");
        if (startedIn === generation) {
          snapshots.write(key, report);
          reports.current.set(key, report);
        }
        if (!cancelled) setState({ key, report, loading: false });
      } catch (reason) {
        if (cancelled) return;
        const error = reason instanceof Error ? reason.message : String(reason);
        setState((current) => ({
          key,
          report: current.key === key ? current.report : undefined,
          loading: false,
          error,
        }));
        void showToast({ style: Toast.Style.Failure, title: "Could Not Load Report", message: error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, agent, section, key, revision]);

  function refresh() {
    // Every agent view must be refreshed after new activity, not just the visible one.
    generation += 1;
    snapshots.clear();
    reports.current.clear();
    setRevision((value) => value + 1);
  }
  return { ...(state.key === key ? state : { key, loading: true }), refresh };
}
