import { useEffect, useRef, useState } from "react";
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
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { makeScramble } from "./help/scramble";
import { scrambleImage, timerImage } from "./help/screen";
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

function ImportForm({ onImport }: { onImport: (solves: Solve[]) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            icon={Icon.Download}
            onSubmit={async (values: { file: string[] }) => {
              const file = values.file?.[0];
              if (!file) {
                await showToast({ style: Toast.Style.Failure, title: "No file selected" });
                return;
              }
              try {
                const text = await fs.readFile(file, "utf8");
                const imported = importFromCsTimer(text);
                onImport(imported);
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
    </Form>
  );
}

export default function command() {
  const { value: stored, setValue: setSolves, isLoading } = useLocalStorage<Solve[]>("solves", []);
  const solves = stored ?? [];

  const [scramble, setScramble] = useState(() => makeScramble());
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function start() {
    setElapsed(0);
    startRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
  }

  function stop() {
    clearInterval(intervalRef.current);
    setRunning(false);
    const finalTime = Date.now() - startRef.current;
    setElapsed(finalTime);
    const solve: Solve = { time: finalTime, scramble, date: Math.floor(Date.now() / 1000), penalty: 0 };
    setSolves([solve, ...solves]);
    setScramble(makeScramble());
  }

  function toggle() {
    if (running) stop();
    else start();
  }

  function newScramble() {
    if (running) return;
    setScramble(makeScramble());
    setElapsed(0);
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

  async function exportData() {
    try {
      const json = exportToCsTimer(solves);
      const file = join(homedir(), "Downloads", `cstimer_${timestamp()}.txt`);
      await fs.writeFile(file, json, "utf8");
      await showToast({ style: Toast.Style.Success, title: "Exported to Downloads", message: file });
      await showInFinder(file);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(error) });
    }
  }

  function handleImport(imported: Solve[]) {
    setSolves(mergeSolves(solves, imported));
  }

  const eff = solves.map(effectiveTime);
  const finite = eff.filter((t) => Number.isFinite(t));
  const best = finite.length > 0 ? Math.min(...finite) : undefined;
  const ao5 = averageOf(eff, 5);
  const ao12 = averageOf(eff, 12);
  const dash = "–";

  const footer =
    solves.length > 0
      ? `best ${best !== undefined ? formatTime(best) : dash}  ·  ao5 ${ao5 !== undefined ? formatTime(ao5) : dash}  ·  ao12 ${ao12 !== undefined ? formatTime(ao12) : dash}  ·  solves ${solves.length}`
      : undefined;

  let centerText: string;
  let big: boolean;
  if (running) {
    centerText = formatTime(elapsed, 1);
    big = true;
  } else if (elapsed > 0) {
    centerText = formatTime(elapsed, 2);
    big = true;
  } else {
    centerText = "Press Enter to start";
    big = false;
  }

  const top = scrambleImage(scramble, environment.appearance);
  const bottom = timerImage(centerText, big, environment.appearance, footer);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`![scramble](${top})\n\n![timer](${bottom})`}
      actions={
        <ActionPanel>
          <Action
            title={running ? "Stop Timer" : "Start Timer"}
            icon={running ? Icon.Stop : Icon.Play}
            onAction={toggle}
          />
          <Action
            title="New Scramble"
            icon={Icon.Shuffle}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={newScramble}
          />
          <Action
            title="Export to Cstimer"
            icon={Icon.Upload}
            shortcut={shortcut(["cmd", "shift"], "e")}
            onAction={exportData}
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
