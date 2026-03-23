import { useState } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { useProcesses } from "./hooks/use-processes";
import { useRecentlyKilled } from "./hooks/use-recently-killed";
import {
  killProcess,
  forceKillProcess,
  killMultiple,
} from "./utils/process-actions";
import { getProcessIcon } from "./utils/process";
import { formatCpu, formatMem } from "./utils/format";
import type { Preferences, Process } from "./types";

export default function ResourceHogs() {
  const prefs = getPreferenceValues<Preferences>();
  const cpuThreshold = parseFloat(prefs.cpuThreshold) || 10;
  const memThresholdKb = (parseFloat(prefs.memThreshold) || 1024) * 1024;
  const [showDetail, setShowDetail] = useState(false);

  const { processes, isLoading, refresh, removeProcess, removeProcesses } =
    useProcesses("cpu", "desc", "none");
  const { addEntry } = useRecentlyKilled();

  const cpuHogs = processes.filter((p) => p.cpu >= cpuThreshold);
  const memHogs = processes.filter((p) => p.rss >= memThresholdKb);

  const handleKill = (proc: Process) => {
    killProcess(proc, prefs, addEntry);
    removeProcess(proc.pid);
  };

  const handleForceKill = (proc: Process) => {
    forceKillProcess(proc, prefs, addEntry);
    removeProcess(proc.pid);
  };

  const handleKillAllHogs = () => {
    const allHogs = [
      ...new Map([...cpuHogs, ...memHogs].map((p) => [p.pid, p])).values(),
    ];
    killMultiple(allHogs, false, addEntry);
    removeProcesses(new Set(allHogs.map((p) => p.pid)));
  };

  const renderHog = (proc: Process) => (
    <List.Item
      key={proc.pid}
      title={proc.name}
      subtitle={prefs.showPid ? `${proc.pid}` : undefined}
      icon={getProcessIcon(proc)}
      accessories={[
        {
          tag: {
            value: formatCpu(proc.cpu),
            color: proc.cpu >= cpuThreshold ? Color.Red : Color.SecondaryText,
          },
        },
        {
          tag: {
            value: formatMem(proc.rss),
            color: proc.rss >= memThresholdKb ? Color.Red : Color.SecondaryText,
          },
        },
      ]}
      detail={
        showDetail ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Name"
                  text={proc.name}
                />
                <List.Item.Detail.Metadata.Label
                  title="PID"
                  text={String(proc.pid)}
                />
                <List.Item.Detail.Metadata.Label
                  title="CPU"
                  text={formatCpu(proc.cpu)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Memory"
                  text={formatMem(proc.rss)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Path"
                  text={proc.comm}
                />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Kill"
            icon={Icon.XMarkCircle}
            onAction={() => handleKill(proc)}
          />
          <Action
            title="Force Kill"
            icon={Icon.XMarkCircleFilled}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => handleForceKill(proc)}
          />
          <Action
            title="Kill All Hogs"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            onAction={handleKillAllHogs}
          />
          <Action
            title="Toggle Detail"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setShowDetail((v) => !v)}
          />
          <Action.CopyToClipboard
            title="Copy PID"
            content={String(proc.pid)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        </ActionPanel>
      }
    />
  );

  const totalHogs = new Set([...cpuHogs, ...memHogs].map((p) => p.pid)).size;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter resource hogs..."
      isShowingDetail={showDetail}
    >
      {totalHogs === 0 && !isLoading ? (
        <List.EmptyView
          title="No Resource Hogs"
          description={`No processes exceed ${cpuThreshold}% CPU or ${prefs.memThreshold}MB memory`}
          icon={Icon.CheckCircle}
        />
      ) : (
        <>
          {cpuHogs.length > 0 && (
            <List.Section
              title="CPU Hogs"
              subtitle={`>${cpuThreshold}% CPU — ${cpuHogs.length} processes`}
            >
              {cpuHogs.map(renderHog)}
            </List.Section>
          )}
          {memHogs.length > 0 && (
            <List.Section
              title="Memory Hogs"
              subtitle={`>${prefs.memThreshold}MB — ${memHogs.length} processes`}
            >
              {memHogs.map(renderHog)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
