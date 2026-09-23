import { useEffect, useMemo, useRef, useState } from "react";
import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { makeScramble } from "./help/scramble";
import { scrambleImage, statsImage, timerImage } from "./help/screen";
import { Solve, effectiveTime, exportToCsTimer, importFromCsTimer, mergeSolves } from "./help/cstimer";

function formatTime(ms: number, decimals = 2): string {
  if (!Number.isFinite(ms)) return "DNF";
  // Round to the displayed precision first so the carry rolls into minutes (e.g. 119.999s -> 2:00.00, not 1:60.00).
  const factor = 10 ** decimals;
  const totalSeconds = Math.round((ms / 1000) * factor) / factor;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const secondsStr = seconds.toFixed(decimals).padStart(decimals + 3, "0");
  return minutes > 0 ? `${minutes}:${secondsStr}` : secondsStr;
}

type Phase = "idle" | "inspecting" | "solving";

type Precision = "whole" | "half" | "tenths" | "hundredths";
const STEP_SECONDS: Record<Precision, number> = { whole: 1, half: 0.5, tenths: 0.1, hundredths: 0.01 };
const STEP_INTERVAL_MS: Record<Precision, number> = { whole: 1000, half: 500, tenths: 100, hundredths: 50 };

// Running display snapped to the chosen step (e.g. 12, 12.5, 12.3, or 12.34). The final time stays exact.
function formatRunning(ms: number, step: number): string {
  const snapped = Math.floor(ms / (step * 1000)) * step;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const minutes = Math.floor(snapped / 60);
  const seconds = snapped - minutes * 60;
  const secondsStr = seconds.toFixed(decimals);
  if (minutes > 0) return `${minutes}:${secondsStr.padStart(decimals > 0 ? decimals + 3 : 2, "0")}`;
  return secondsStr;
}

function mean(list: number[]): number {
  return list.reduce((a, b) => a + b, 0) / list.length;
}

// WCA-style average: drop the best and worst, mean the rest. Uses the n most recent solves.
function averageOf(times: number[], n: number): number | undefined {
  if (times.length < n) return undefined;
  const window = times.slice(0, n);
  const sorted = [...window].sort((a, b) => a - b);
  return mean(sorted.slice(1, -1));
}

// Build a platform-specific shortcut (cmd on macOS, ctrl on Windows) to avoid ambiguous-platform warnings.
function shortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const windowsModifiers = modifiers.map((m) => (m === "cmd" ? "ctrl" : m)) as Keyboard.KeyModifier[];
  return { macOS: { modifiers, key }, Windows: { modifiers: windowsModifiers, key } };
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const NOTATION_HELP = `# Cube Notation

Each letter turns that face **90° clockwise**, as if you are looking straight at it.
The six faces are **R** (right), **L** (left), **U** (up), **D** (down), **F** (front), **B** (back).

## Basic moves
<img src="notations/basic-moves-1.webp" width="440" alt="Basic moves R L U" />

<img src="notations/basic-moves-2.webp" width="440" alt="Basic moves D F B" />

## Modifiers & wide moves
<img src="notations/other-moves.webp" width="440" alt="Other moves" />

**'** = counter-clockwise (prime) · **2** = 180° half turn · a **lowercase** letter (like \`r\`) turns two layers at once.

## Slice turns
<img src="notations/slice-turns.webp" width="440" alt="Slice turns" />

**M** follows L, **S** follows F, **E** follows D — the middle layers.

## Rotations
<img src="notations/rotations.webp" width="484" alt="Rotations" />

**x / y / z** rotate the whole cube (x follows R, y follows U, z follows F).

_Scrambles only use the basic face turns with \`'\` and \`2\`; the rest are here for reference._
`;

function NotationHelp() {
  return <Detail navigationTitle="Cube Notation" markdown={NOTATION_HELP} />;
}

type ImportOptions = { replace: boolean; minSeconds: number };

function ImportForm({ onImport }: { onImport: (solves: Solve[], options: ImportOptions) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            icon={Icon.Download}
            onSubmit={async (values: { file: string[]; replace: boolean; minSeconds: string }) => {
              const file = values.file?.[0];
              if (!file) {
                await showToast({ style: Toast.Style.Failure, title: "No file selected" });
                return;
              }
              const parsedMin = Number.parseFloat(values.minSeconds);
              const minSeconds = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 0;
              try {
                const text = await fs.readFile(file, "utf8");
                const imported = importFromCsTimer(text);
                onImport(imported, { replace: values.replace, minSeconds });
                await showToast({ style: Toast.Style.Success, title: `Imported ${imported.length} solves` });
                pop();
              } catch (error) {
                await showToast({ style: Toast.Style.Failure, title: "Import failed", message: String(error) });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Select a csTimer export file (.txt) to import your solves." />
      <Form.FilePicker id="file" title="csTimer File" allowMultipleSelection={false} />
      <Form.Checkbox
        id="replace"
        title="Replace"
        label="Forget existing solves and use only the imported ones"
        defaultValue={false}
      />
      <Form.TextField
        id="minSeconds"
        title="Remove Solves Under (seconds)"
        placeholder="0"
        defaultValue="0"
        info="Solves faster than this are dropped (useful for accidental stops). 0 keeps everything."
      />
    </Form>
  );
}

function ExportForm({ solves }: { solves: Solve[] }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export"
            icon={Icon.Upload}
            onSubmit={async (values: { minSeconds: string }) => {
              const parsed = Number.parseFloat(values.minSeconds);
              const minMs = Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : 0;
              const filtered = minMs > 0 ? solves.filter((s) => s.time >= minMs) : solves;
              try {
                const json = exportToCsTimer(filtered);
                const file = join(homedir(), "Downloads", `cstimer_${timestamp()}.txt`);
                await fs.writeFile(file, json, "utf8");
                await showToast({
                  style: Toast.Style.Success,
                  title: `Exported ${filtered.length} solves`,
                  message: file,
                });
                await showInFinder(file);
                pop();
              } catch (error) {
                await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(error) });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Export your solves to a csTimer file in your Downloads folder." />
      <Form.TextField
        id="minSeconds"
        title="Remove Solves Under (seconds)"
        placeholder="0"
        defaultValue="0"
        info="Solves faster than this are left out of the export. 0 exports everything."
      />
    </Form>
  );
}

export default function command() {
  const {
    precision = "tenths",
    inspection = false,
    inspectionSeconds = "15",
  } = getPreferenceValues<{
    precision?: Precision;
    inspection?: boolean;
    inspectionSeconds?: string;
  }>();
  const step = STEP_SECONDS[precision] ?? STEP_SECONDS.tenths;
  const intervalMs = STEP_INTERVAL_MS[precision] ?? STEP_INTERVAL_MS.tenths;

  const parsedInspection = Number.parseFloat(inspectionSeconds);
  const inspectSec = Number.isFinite(parsedInspection) && parsedInspection > 0 ? parsedInspection : 15;
  const plus2Ms = inspectSec * 1000;
  const dnfMs = (inspectSec + 2) * 1000;

  const { value: stored, setValue: setSolves, isLoading } = useLocalStorage<Solve[]>("solves", []);
  const solves = stored ?? [];

  const [scramble, setScramble] = useState(() => makeScramble());
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [lastPenalty, setLastPenalty] = useState(0);

  const startRef = useRef(0);
  const inspectionPenaltyRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Tracks the last displayed "bucket" so we only re-render (and swap the timer image) when the
  // shown value actually changes — never more often. Raycast rasterizes each SVG to a static image,
  // so a new data URI is a real image reload; this keeps reloads at the theoretical minimum.
  const lastBucketRef = useRef(-1);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Timing is always derived from Date.now() - startRef; the interval only samples it.
  function tick(bucketMs: number) {
    const ms = Date.now() - startRef.current;
    const bucket = Math.floor(ms / bucketMs);
    if (bucket !== lastBucketRef.current) {
      lastBucketRef.current = bucket;
      setElapsed(ms);
    }
  }

  function beginInspection() {
    clearInterval(intervalRef.current);
    inspectionPenaltyRef.current = 0;
    lastBucketRef.current = -1;
    setElapsed(0);
    startRef.current = Date.now();
    setPhase("inspecting");
    intervalRef.current = setInterval(() => tick(1000), 100); // inspection shows whole seconds
  }

  function beginSolve(fromInspection: boolean) {
    clearInterval(intervalRef.current);
    if (fromInspection) {
      const inspectionMs = Date.now() - startRef.current;
      // Over the inspection time adds +2; 2s past it is a DNF.
      inspectionPenaltyRef.current = inspectionMs > dnfMs ? -1 : inspectionMs > plus2Ms ? 2000 : 0;
    } else {
      inspectionPenaltyRef.current = 0;
    }
    lastBucketRef.current = -1;
    setElapsed(0);
    startRef.current = Date.now();
    setPhase("solving");
    intervalRef.current = setInterval(() => tick(step * 1000), intervalMs); // one bucket per shown step
  }

  function finishSolve() {
    clearInterval(intervalRef.current);
    const finalTime = Date.now() - startRef.current;
    const penalty = inspectionPenaltyRef.current;
    setLastTime(finalTime);
    setLastPenalty(penalty);
    const solve: Solve = { time: finalTime, scramble, date: Math.floor(Date.now() / 1000), penalty };
    setSolves([solve, ...solves]);
    setScramble(makeScramble());
    setPhase("idle");
  }

  // Enter drives the flow: idle -> (inspection ->) solving -> idle.
  function advance() {
    if (phase === "solving") finishSolve();
    else if (phase === "inspecting") beginSolve(true);
    else if (inspection) beginInspection();
    else beginSolve(false);
  }

  function newScramble() {
    if (phase !== "idle") return;
    setScramble(makeScramble());
    setLastTime(0);
    setLastPenalty(0);
  }

  function deleteLast() {
    setSolves(solves.slice(1));
  }

  async function clearAll() {
    if (solves.length === 0) return;
    const confirmed = await confirmAlert({
      title: "Clear all times?",
      message: `This permanently deletes all ${solves.length} saved solves. Export first if you want a backup.`,
      icon: Icon.Trash,
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await setSolves([]);
    }
  }

  function handleImport(imported: Solve[], options: ImportOptions) {
    // "replace" starts from an empty list (forgets local solves); otherwise merge into existing.
    const base = options.replace ? [] : solves;
    const merged = mergeSolves(base, imported);
    const minMs = options.minSeconds * 1000;
    const result = minMs > 0 ? merged.filter((s) => s.time >= minMs) : merged;
    setSolves(result);
  }

  // Scramble image only depends on the scramble, so memoizing keeps a byte-identical data URI while
  // the timer ticks — Raycast then reuses the same image and never reloads it.
  const top = useMemo(() => scrambleImage(scramble, environment.appearance), [scramble]);

  let centerText: string;
  let big: boolean;
  if (phase === "solving") {
    centerText = formatRunning(elapsed, step);
    big = true;
  } else if (phase === "inspecting") {
    if (elapsed > dnfMs) centerText = "DNF";
    else if (elapsed > plus2Ms) centerText = "+2";
    else centerText = String(Math.max(0, Math.ceil(inspectSec) - Math.floor(elapsed / 1000)));
    big = true;
  } else if (lastTime > 0) {
    if (lastPenalty === -1) centerText = "DNF";
    else if (lastPenalty === 2000) centerText = `${formatTime(lastTime + 2000, 2)}+`;
    else centerText = formatTime(lastTime, 2);
    big = true;
  } else {
    centerText = inspection ? "Press Enter to inspect" : "Press Enter to start";
    big = false;
  }

  // Memoized on the shown text, so a re-render that doesn't change the value keeps the exact same
  // data URI (no reload). Combined with the tick() gate, the image swaps once per value change.
  const timerUri = useMemo(() => timerImage(centerText, big, environment.appearance), [centerText, big]);
  const timerBlock = `<img alt="timer" src="${timerUri}" height="180" />`;

  // Stats only change when a solve is added, so compute them (and their image) once per solve
  // instead of on every timer tick. They're shown only at rest, so they can never jump.
  const statsUri = useMemo(() => {
    if (solves.length === 0) return "";
    const eff = solves.map(effectiveTime);
    const finite = eff.filter((t) => Number.isFinite(t));
    const dash = "–";
    const best = finite.length > 0 ? formatTime(Math.min(...finite)) : dash;
    const ao5 = averageOf(eff, 5);
    const ao12 = averageOf(eff, 12);
    const text = `best ${best}  ·  ao5 ${ao5 !== undefined ? formatTime(ao5) : dash}  ·  ao12 ${ao12 !== undefined ? formatTime(ao12) : dash}  ·  solves ${solves.length}`;
    return statsImage(text, environment.appearance);
  }, [solves]);
  const statsBlock = phase === "idle" && statsUri ? `![stats](${statsUri})` : "";

  const markdown = [`![scramble](${top})`, timerBlock, statsBlock].filter(Boolean).join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={
              phase === "solving"
                ? "Stop Timer"
                : phase === "inspecting"
                  ? "Start Solve"
                  : inspection
                    ? "Start Inspection"
                    : "Start Timer"
            }
            icon={phase === "solving" ? Icon.Stop : Icon.Play}
            onAction={advance}
          />
          <Action
            title="New Scramble"
            icon={Icon.Shuffle}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={newScramble}
          />
          <Action.Push
            title="Cube Notation"
            icon={Icon.QuestionMarkCircle}
            shortcut={shortcut(["cmd"], "/")}
            target={<NotationHelp />}
          />
          <Action.Push
            title="Export to Cstimer"
            icon={Icon.Upload}
            shortcut={shortcut(["cmd", "shift"], "e")}
            target={<ExportForm solves={solves} />}
          />
          <Action.Push
            title="Import from Cstimer"
            icon={Icon.Download}
            shortcut={shortcut(["cmd", "shift"], "i")}
            target={<ImportForm onImport={handleImport} />}
          />
          <Action
            title="Delete Last Time"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={deleteLast}
          />
          <Action
            title="Clear All Times"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={clearAll}
          />
        </ActionPanel>
      }
    />
  );
}
