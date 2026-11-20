/**
 * Drill-down view listing every live process of one application.
 * Refreshes on the same cadence as the main views and offers per-process actions.
 */

import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAppSubprocesses } from "../data/queries";
import { GlobalPreferences, SubprocessItem } from "../data/types";
import { cadenceToMs } from "../hooks/useLiveStats";
import { formatBytes, formatPercent, formatRate } from "../utils/formatting";
import { killProcess } from "../utils/processControl";
import { OpenMonitorAction } from "./Actions";

/** Copies text to the clipboard and confirms with a toast. */
async function copyWithToast(text: string, toastTitle: string): Promise<void> {
  await Clipboard.copy(text);
  await showToast({ style: Toast.Style.Success, title: toastTitle });
}

/** Shows a file in Finder, with a toast if it no longer exists. */
async function revealPath(path: string): Promise<void> {
  try {
    await showInFinder(path);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Could not reveal in Finder" });
  }
}

interface SubprocessListProps {
  appName: string;
}

export function SubprocessList(props: SubprocessListProps) {
  const appName = props.appName;
  const [items, setItems] = useState<SubprocessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const cadenceMs = cadenceToMs(getPreferenceValues<GlobalPreferences>().refreshCadence);

  const refresh = useCallback(async () => {
    try {
      const latest = await getAppSubprocesses(appName);
      if (isMountedRef.current) {
        setItems(latest);
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not read performance data", message: String(error) });
    }
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, [appName]);

  // Poll: each tick schedules the next only after it finishes (see useLiveStats for the same pattern).
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await refresh();
      if (!isCancelled) {
        timer = setTimeout(tick, cadenceMs);
      }
    };

    tick();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [refresh, cadenceMs]);

  let totalMemory = 0;
  let totalCpu = 0;
  for (const item of items) {
    totalMemory += item.memoryBytes;
    totalCpu += item.cpuPercent;
  }

  const sectionTitle = items.length + (items.length === 1 ? " process" : " processes");
  const sectionSubtitle = formatBytes(totalMemory) + " · " + formatPercent(totalCpu) + " CPU";

  return (
    <List isLoading={isLoading} navigationTitle={appName} searchBarPlaceholder={"Filter " + appName + " processes..."}>
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={isLoading ? "Loading..." : appName + " has no running processes"}
        description={isLoading ? undefined : "It may have just quit. Go back to see the updated list."}
      />
      <List.Section title={sectionTitle} subtitle={sectionSubtitle}>
        {items.map((proc) => (
          <ProcessRow key={proc.pid} proc={proc} onRefresh={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

interface ProcessRowProps {
  proc: SubprocessItem;
  onRefresh: () => void;
}

/** One row of the process list, with its accessories and actions. */
function ProcessRow(props: ProcessRowProps) {
  const proc = props.proc;
  const hasPath = proc.executablePath.length > 0;
  const diskRate = proc.diskReadBytes + proc.diskWrittenBytes;

  // Accessories show right-aligned in the row. Disk rate is only shown when there is any.
  const accessories: List.Item.Accessory[] = [];
  if (diskRate > 0) {
    accessories.push({ text: formatRate(diskRate), tooltip: "Disk read + write rate" });
  }
  accessories.push({ text: formatPercent(proc.cpuPercent), tooltip: "CPU (percent of one core)" });
  accessories.push({ text: formatBytes(proc.memoryBytes), tooltip: "Physical memory footprint" });
  if (proc.isTranslated) {
    accessories.push({ tag: { value: "Rosetta", color: Color.Orange }, tooltip: "Running under Rosetta 2 (x86_64)" });
  } else {
    accessories.push({ tag: { value: proc.architecture, color: Color.SecondaryText }, tooltip: "Architecture" });
  }

  async function handleQuit() {
    await killProcess(proc.pid, proc.name, false);
    props.onRefresh();
  }

  async function handleForceQuit() {
    await killProcess(proc.pid, proc.name, true);
    props.onRefresh();
  }

  return (
    <List.Item
      title={proc.name}
      subtitle={"PID " + proc.pid}
      icon={Icon.Terminal}
      keywords={[String(proc.pid)]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy PID"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyWithToast(String(proc.pid), "Copied PID " + proc.pid)}
            />
            {hasPath && (
              <Action
                title="Copy Executable Path"
                icon={Icon.Document}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
                onAction={() => copyWithToast(proc.executablePath, "Copied path")}
              />
            )}
            {hasPath && (
              <Action
                title="Reveal Executable in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => revealPath(proc.executablePath)}
              />
            )}
            <OpenMonitorAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Process">
            <Action
              title="Quit Process"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "q" }}
              onAction={handleQuit}
            />
            <Action
              title="Force Quit Process"
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "q" }}
              onAction={handleForceQuit}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
