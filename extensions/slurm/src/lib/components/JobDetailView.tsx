import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readLogTail, showJob, streamJobMetrics } from "../slurm";
import { type GpuSample, type MetricSample, gpuCount, parseMetricStream, windowAvg, windowSeconds } from "../metrics";
import { DEMO_MODE, isDemoHost, mockMetricSample } from "../demo";
import {
  buildJobTime,
  formatDurationSeconds,
  formatShortDateTime,
  gpuInfoFromTres,
  memFromTres,
  parseSlurmDateTime,
  prettifyGpuModel,
  progressBar,
  relativeFromNow,
  shortReason,
  stateColor,
} from "../format";

// Shared job detail view used by both "My Slurm Jobs" and "All Slurm Jobs".
// The view is a left-hand navigation list (standard Raycast list + detail
// pattern, arrow-key navigable) of sections, with the selected section's
// content rendered in the detail pane on the right. The same layout is used
// for owned and other users' jobs; only the data shown inside each section
// differs (e.g. live utilization is owner-only).
type SectionId = "info" | "schedule" | "utilization" | "stdout" | "stderr";

const SECTIONS: { id: SectionId; title: string; icon: Icon }[] = [
  { id: "info", title: "Info", icon: Icon.Info },
  { id: "schedule", title: "Schedule", icon: Icon.Calendar },
  { id: "utilization", title: "Utilization", icon: Icon.LineChart },
  { id: "stdout", title: "Output (stdout)", icon: Icon.Text },
  { id: "stderr", title: "Error (stderr)", icon: Icon.ExclamationMark },
];

export function JobDetailView({ host, jobId, owned = false }: { host: string; jobId: string; owned?: boolean }) {
  const { data, isLoading } = useCachedPromise((h: string, id: string) => showJob(h, id), [host, jobId]);
  const fields = data?.fields;

  return (
    <List isShowingDetail isLoading={isLoading} navigationTitle={`Job ${jobId} — ${host}`}>
      {SECTIONS.map((section) =>
        section.id === "stdout" || section.id === "stderr" ? (
          <LogItem key={section.id} section={section} host={host} fields={fields} owned={owned} stream={section.id} />
        ) : (
          <List.Item
            key={section.id}
            title={section.title}
            icon={section.icon}
            detail={renderSection(section.id, { host, jobId, fields, owned })}
          />
        ),
      )}
    </List>
  );
}

type SectionProps = { host: string; jobId: string; fields?: Record<string, string>; owned: boolean };

function renderSection(id: SectionId, props: SectionProps) {
  switch (id) {
    case "info":
      return <InfoDetail fields={props.fields} jobId={props.jobId} />;
    case "schedule":
      return <ScheduleDetail {...props} />;
    case "utilization":
      return <UtilizationDetail {...props} />;
    default:
      return <List.Item.Detail markdown="" />;
  }
}

// Identity + allocation at a glance: Job ID as a prominent header, then the
// owner and the requested compute (GPUs / VRAM / CPUs) as labelled rows.
function InfoDetail({ fields, jobId }: { fields?: Record<string, string>; jobId: string }) {
  if (!fields) return <List.Item.Detail isLoading markdown="" />;

  // scontrol exposes the resources as AllocTRES (running) / ReqTRES (pending),
  // not a plain "TRES" field — read those so GPUs and RAM resolve on real
  // clusters, falling back to TRES for the demo / older Slurm. A pending job's
  // AllocTRES is the literal string "(null)" (truthy!), so skip placeholder
  // values rather than letting them short-circuit the fallback to ReqTRES.
  const tres = firstMeaningfulTres(fields.AllocTRES, fields.ReqTRES, fields.TRES);
  const gpu = gpuInfoFromTres(tres);
  const ram = memFromTres(tres);

  const header = `# Job ${fields.JobId ?? jobId}`;
  const name = fields.JobName ? `\n\n**${fields.JobName}**` : "";

  return (
    <List.Item.Detail
      markdown={header + name}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="User" text={userName(fields.UserId)} icon={Icon.Person} />
          <List.Item.Detail.Metadata.Separator />
          {gpu ? (
            <List.Item.Detail.Metadata.TagList title="GPUs">
              <List.Item.Detail.Metadata.TagList.Item
                text={gpu.type ? `${gpu.count} × ${prettifyGpuModel(gpu.type)}` : `${gpu.count} GPU`}
                color={Color.Green}
                icon={Icon.ComputerChip}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="GPUs" text="none" icon={Icon.ComputerChip} />
          )}
          <List.Item.Detail.Metadata.Label title="RAM" text={ram ? prettifyMem(ram) : "—"} icon={Icon.MemoryChip} />
          <List.Item.Detail.Metadata.Label title="CPUs" text={fields.NumCPUs || "—"} icon={Icon.Gauge} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Timing of the job, shaped by its state:
//  • RUNNING  → progress bar toward the time limit, remaining, projected end.
//  • PENDING  → reason, estimated start, partition.
//  • finished → total elapsed, start / end, time limit.
function ScheduleDetail({ fields }: SectionProps) {
  const state = (fields?.JobState ?? "").toUpperCase();
  const pending = state.startsWith("PENDING");
  const running = state.startsWith("RUNNING");

  // Tick once a second so a running job's progress / remaining advance live.
  const now = useNow(running);

  if (!fields) return <List.Item.Detail isLoading markdown="" />;
  if (pending) return <PendingSchedule fields={fields} />;
  return <TimedSchedule fields={fields} now={now} running={running} />;
}

// Live per-job utilization. A persistent `srun --overlap` step streams one tick
// per second (see streamJobMetrics); we accumulate the samples since the view
// opened and show, per allocated GPU plus the job-wide CPU/RAM, two figures: the
// run average (whole session) and a trailing window average (≤30 s). Only owned,
// running jobs can be sampled — srun --overlap requires owning the job, and a
// pending/finished job has nothing to stream.
function UtilizationDetail({ host, jobId, fields, owned }: SectionProps) {
  const state = (fields?.JobState ?? "").toUpperCase();
  const running = state.startsWith("RUNNING");

  if (!fields) return <List.Item.Detail isLoading markdown="" />;
  if (!running) {
    return (
      <List.Item.Detail
        markdown={`# Utilization\n\nLive metrics are only available while the job is **running**.\n\nCurrent state: \`${state || "—"}\`.`}
      />
    );
  }
  if (!owned) {
    return <List.Item.Detail markdown={`# Utilization\n\nLive metrics are only available for **your own** jobs.`} />;
  }
  return <LiveUtilization host={host} jobId={jobId} />;
}

// Cap on retained samples (~5 min at 1 Hz). Bounds memory the same way TailView
// caps its line buffer; the run average becomes a rolling 5-min figure past that.
const MAX_SAMPLES = 300;

function LiveUtilization({ host, jobId }: { host: string; jobId: string }) {
  const [samples, setSamples] = useState<MetricSample[]>([]);
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Demo mode: no srun stream to attach to — feed fixed samples on the same
    // 1 Hz cadence so the run / window averages render with stable values.
    if (DEMO_MODE && isDemoHost(host)) {
      const push = () => {
        const s = mockMetricSample(host, jobId);
        if (s) setSamples((prev) => [...prev, s].slice(-MAX_SAMPLES));
      };
      push();
      const demoTick = setInterval(() => {
        push();
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(demoTick);
    }

    const proc = streamJobMetrics(host, jobId);
    let buffer = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      const { samples: parsed, rest } = parseMetricStream(buffer + chunk.toString());
      buffer = rest;
      if (parsed.length) setSamples((prev) => [...prev, ...parsed].slice(-MAX_SAMPLES));
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) setError(text);
    });
    // Re-render every second so the trailing window slides and grows live.
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      try {
        proc.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    };
  }, [host, jobId]);

  if (samples.length === 0) {
    const md = error ? `# Utilization\n\nCould not start the metrics stream:\n\n\`\`\`\n${error}\n\`\`\`` : "";
    return <List.Item.Detail isLoading={!error} markdown={md} />;
  }

  const winSec = windowSeconds(openedAt, now);
  const sinceWindow = now - winSec * 1000;
  const gpus = gpuList(samples);
  const nGpu = gpuCount(samples);

  const rows = [
    <List.Item.Detail.Metadata.TagList title="Status" key="status">
      <List.Item.Detail.Metadata.TagList.Item text="RUNNING" color={stateColor("RUNNING")} />
    </List.Item.Detail.Metadata.TagList>,
  ];

  for (const g of gpus) {
    const vram = g.memTotalMiB > 0 ? ` · ${Math.round(g.memTotalMiB / 1024)} GB` : "";
    rows.push(
      <List.Item.Detail.Metadata.Separator key={`gpu-${g.index}-sep`} />,
      <List.Item.Detail.Metadata.Label
        title={`GPU ${g.index}`}
        text={(g.name ? prettifyGpuModel(g.name) : "GPU") + vram}
        icon={Icon.ComputerChip}
        key={`gpu-${g.index}-name`}
      />,
      metricRow("Utilization", samples, sinceWindow, winSec, (s) => gpuPick(s, g.index, "util"), `gpu-${g.index}-util`),
      metricRow("VRAM", samples, sinceWindow, winSec, (s) => gpuPick(s, g.index, "memPct"), `gpu-${g.index}-vram`),
    );
  }
  if (nGpu === 0) {
    rows.push(
      <List.Item.Detail.Metadata.Separator key="gpu-none-sep" />,
      <List.Item.Detail.Metadata.Label title="GPUs" text="none allocated" icon={Icon.ComputerChip} key="gpu-none" />,
    );
  }

  rows.push(
    <List.Item.Detail.Metadata.Separator key="host-sep" />,
    metricRow("CPU", samples, sinceWindow, winSec, (s) => s.cpu, "cpu"),
    metricRow("RAM", samples, sinceWindow, winSec, (s) => s.ram, "ram"),
  );

  return <List.Item.Detail metadata={<List.Item.Detail.Metadata>{rows}</List.Item.Detail.Metadata>} />;
}

// One labelled row carrying two pills: the run average (whole session) and the
// trailing-window average (≤30 s), each tinted by its own value.
function metricRow(
  title: string,
  samples: MetricSample[],
  sinceWindow: number,
  winSec: number,
  pick: (s: MetricSample) => number | null,
  key: string,
) {
  const run = windowAvg(samples, 0, pick);
  const win = windowAvg(samples, sinceWindow, pick);
  return (
    <List.Item.Detail.Metadata.TagList title={title} key={key}>
      <List.Item.Detail.Metadata.TagList.Item text={`run ${fmtPct(run)}`} color={utilColor(run)} />
      <List.Item.Detail.Metadata.TagList.Item text={`${winSec}s ${fmtPct(win)}`} color={utilColor(win)} />
    </List.Item.Detail.Metadata.TagList>
  );
}

// The GPU samples from the most recent tick that has any — gives the allocated
// GPU set (index + model + total VRAM) without assuming a contiguous 0..n range.
function gpuList(samples: MetricSample[]): GpuSample[] {
  for (let i = samples.length - 1; i >= 0; i--) if (samples[i].gpus.length) return samples[i].gpus;
  return [];
}

function gpuPick(s: MetricSample, index: number, field: "util" | "memPct"): number | null {
  const g = s.gpus.find((x) => x.index === index);
  return g ? g[field] : null;
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}

// Saturation tint, matching node-utilization's "how full is it" semantics:
// green = comfortable headroom, orange = busy, red = near saturation.
function utilColor(pct: number | null): Color {
  if (pct == null) return Color.SecondaryText;
  if (pct >= 90) return Color.Red;
  if (pct >= 70) return Color.Orange;
  return Color.Green;
}

// Embedded log viewer for the Output (stdout) / Error (stderr) tabs. Reads the
// path Slurm recorded in the job's run configuration (scontrol's StdOut/StdErr)
// and shows the tail — never the whole file (readLogTail bounds it). Reading the
// file needs filesystem access the job owner has, so this is gated on `owned`.
// Refreshed on a 10 s tick so a running job's log keeps growing in view.
//
// This is a whole List.Item (not just a Detail) because the copy actions live on
// the item, and they need the same fetched tail the detail renders — owning the
// fetch here lets both share it.
const LOG_TAIL_LINES = 500;

function LogItem({
  section,
  host,
  fields,
  owned,
  stream,
}: {
  section: { id: SectionId; title: string; icon: Icon };
  host: string;
  fields?: Record<string, string>;
  owned: boolean;
  stream: "stdout" | "stderr";
}) {
  const label = stream === "stdout" ? "Output (stdout)" : "Error (stderr)";
  const rawPath = stream === "stdout" ? fields?.StdOut : fields?.StdErr;
  const path = firstMeaningfulTres(rawPath); // reuse the "(null)"/"N/A"-aware filter
  const canRead = owned && path.length > 0;

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (h: string, p: string) => readLogTail(h, p, LOG_TAIL_LINES),
    [host, path],
    { execute: canRead, keepPreviousData: true },
  );

  useEffect(() => {
    if (!canRead) return;
    const t = setInterval(() => revalidate(), 10_000);
    return () => clearInterval(t);
  }, [canRead, revalidate]);

  const tail = (data ?? "").replace(/\n+$/, "");
  const detail = (() => {
    if (!fields) return <List.Item.Detail isLoading markdown="" />;
    if (!owned) {
      return <List.Item.Detail markdown={`# ${label}\n\nLog files can only be read for **your own** jobs.`} />;
    }
    if (!path) {
      return (
        <List.Item.Detail
          markdown={`# ${label}\n\nNo ${stream === "stdout" ? "output" : "error"} file is set in this job's run configuration.`}
        />
      );
    }
    const body = error
      ? `Could not read the log file:\n\n\`\`\`\n${(error as Error).message}\n\`\`\``
      : `\`\`\`\n${tail || "(empty — nothing written yet)"}\n\`\`\``;
    // Path as a caption above the tail; the tail keeps newest at the bottom, so
    // scrolling up walks back through earlier lines of the loaded window.
    return <List.Item.Detail isLoading={isLoading && !data} markdown={`\`${path}\`\n\n${body}`} />;
  })();

  return (
    <List.Item
      title={section.title}
      icon={section.icon}
      detail={detail}
      actions={
        <ActionPanel>
          {canRead && tail ? (
            <Action.CopyToClipboard title={stream === "stdout" ? "Copy Output" : "Copy Error Output"} content={tail} />
          ) : null}
          {path ? <Action.CopyToClipboard title="Copy File Path" content={path} /> : null}
          {canRead ? <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} /> : null}
        </ActionPanel>
      }
    />
  );
}

// RUNNING or finished: a single timeline with a progress bar. For finished jobs
// the progress / remaining rows fall away (buildJobTime returns null for them)
// and "Ends" becomes the actual end time.
function TimedSchedule({ fields, now, running }: { fields: Record<string, string>; now: number; running: boolean }) {
  const t = buildJobTime(fields, now);
  const state = fields.JobState ?? "";

  // Metadata-only (no markdown): in List.Item.Detail a markdown block reserves a
  // tall fixed region and pins the metadata to the bottom, leaving a big empty
  // gap. Dropping markdown lets the metadata fill the pane from the top, so the
  // timeline gets the vertical room. The progress bar lives in a metadata row.
  const rows = [
    <List.Item.Detail.Metadata.TagList title="Status" key="status">
      <List.Item.Detail.Metadata.TagList.Item text={state || "—"} color={stateColor(state)} />
    </List.Item.Detail.Metadata.TagList>,
  ];
  if (running && t.progress != null) {
    rows.push(
      <List.Item.Detail.Metadata.Label
        title="Progress"
        text={`${progressBar(t.progress, 18)}  ${Math.round(t.progress * 100)}%`}
        key="progress"
      />,
    );
  }
  rows.push(<List.Item.Detail.Metadata.Separator key="sep" />);
  if (t.elapsedSec != null) {
    rows.push(
      <List.Item.Detail.Metadata.Label
        title="Elapsed"
        text={formatDurationSeconds(t.elapsedSec)}
        icon={Icon.Clock}
        key="elapsed"
      />,
    );
  }
  if (t.remainingSec != null) {
    rows.push(
      <List.Item.Detail.Metadata.Label title="Remaining" text={formatDurationSeconds(t.remainingSec)} key="rem" />,
    );
  }
  rows.push(<List.Item.Detail.Metadata.Label title="Started" text={t.started} key="started" />);
  rows.push(<List.Item.Detail.Metadata.Label title={running ? "Ends (est.)" : "Ended"} text={t.ends} key="ends" />);
  rows.push(
    <List.Item.Detail.Metadata.Label
      title="Time Limit"
      text={t.limitSec == null ? "unlimited" : formatDurationSeconds(t.limitSec)}
      key="limit"
    />,
  );

  return <List.Item.Detail metadata={<List.Item.Detail.Metadata>{rows}</List.Item.Detail.Metadata>} />;
}

// PENDING: the reason Slurm is holding the job, when it expects ours to start,
// and the partition it's queued on.
//
// NOTE: the "Pending Jobs Ahead" list (the partition queue scheduled before this
// job) was removed for now — it wasn't reporting the queue position correctly.
function PendingSchedule({ fields }: { fields: Record<string, string> }) {
  const partition = fields.Partition ?? "";
  const reason = shortReason(fields.Reason) || "—";

  const startDate = parseSlurmDateTime(fields.StartTime ?? "");
  const estStart = startDate
    ? `${formatShortDateTime(fields.StartTime)} · ${relativeFromNow(startDate)}`
    : "not yet estimated";

  const rows = [
    <List.Item.Detail.Metadata.TagList title="Status" key="status">
      <List.Item.Detail.Metadata.TagList.Item text="PENDING" color={stateColor("PENDING")} />
    </List.Item.Detail.Metadata.TagList>,
    <List.Item.Detail.Metadata.Label title="Reason" text={reason} icon={Icon.QuestionMark} key="reason" />,
    <List.Item.Detail.Metadata.Label title="Est. Start" text={estStart} icon={Icon.Clock} key="start" />,
    <List.Item.Detail.Metadata.Label title="Partition" text={partition || "—"} icon={Icon.HardDrive} key="part" />,
  ];

  return <List.Item.Detail metadata={<List.Item.Detail.Metadata>{rows}</List.Item.Detail.Metadata>} />;
}

// Wall-clock that re-renders once a second while `active`; frozen otherwise so
// finished / pending jobs don't tick needlessly.
function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

// memFromTres yields a compact unit suffix ("336G"); expand it for display
// ("336 GB").
function prettifyMem(mem: string): string {
  const m = /^(\d+(?:\.\d+)?)([TGMK])$/i.exec(mem);
  if (!m) return mem;
  return `${m[1]} ${m[2].toUpperCase()}B`;
}

// Pick the first TRES string that actually carries data. scontrol fills unset
// fields with the literal "(null)" / "N/A", which are truthy and would otherwise
// win a plain `a || b` — so a pending job (AllocTRES="(null)") would never reach
// its ReqTRES. Returns "" when none are usable.
function firstMeaningfulTres(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (v && v !== "(null)" && v !== "N/A") return v;
  }
  return "";
}

// scontrol reports UserId as "username(uid)"; show just the username.
function userName(userId: string | undefined): string {
  if (!userId) return "—";
  return userId.replace(/\(\d+\)\s*$/, "").trim() || userId;
}
