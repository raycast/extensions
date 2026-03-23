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
import { useMultiSelect } from "./hooks/use-multi-select";
import { useRecentlyKilled } from "./hooks/use-recently-killed";
import {
  killProcess,
  forceKillProcess,
  sudoForceKill,
  freezeProcess,
  resumeProcess,
  reniceProcess,
  killMultiple,
  killDuplicates,
} from "./utils/process-actions";
import { getProcessIcon, findDuplicates } from "./utils/process";
import { formatCpu, formatMem, formatElapsed } from "./utils/format";
import { getProcessPorts } from "./utils/port";
import type {
  GroupMode,
  Preferences,
  Process,
  SortField,
  SortOrder,
} from "./types";

export default function ListProcesses() {
  const prefs = getPreferenceValues<Preferences>();
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortOrder] = useState<SortOrder>("desc");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [showDetail, setShowDetail] = useState(false);

  const {
    processes,
    groups,
    isLoading,
    refresh,
    removeProcess,
    removeProcesses,
  } = useProcesses(sortField, sortOrder, groupMode);
  const {
    selected,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    count: selectedCount,
  } = useMultiSelect();
  const { addEntry } = useRecentlyKilled();

  const handleKill = (proc: Process) => {
    killProcess(proc, prefs, addEntry);
    removeProcess(proc.pid);
  };

  const handleForceKill = (proc: Process) => {
    forceKillProcess(proc, prefs, addEntry);
    removeProcess(proc.pid);
  };

  const handleSudoKill = (proc: Process) => {
    sudoForceKill(proc, prefs, addEntry);
    removeProcess(proc.pid);
  };

  const handleKillSelected = (force: boolean) => {
    const procs = processes.filter((p) => selected.has(p.pid));
    killMultiple(procs, force, addEntry);
    removeProcesses(selected);
    clearSelection();
  };

  const handleKillAll = (force: boolean) => {
    killMultiple(processes, force, addEntry);
    removeProcesses(new Set(processes.map((p) => p.pid)));
  };

  const handleKillDuplicates = (proc: Process) => {
    const dupes = findDuplicates(processes);
    const group = dupes.get(proc.name);
    if (group) {
      killDuplicates(group, addEntry);
      const toRemove = group.filter(
        (p) => p.pid !== group.sort((a, b) => a.pid - b.pid)[0].pid,
      );
      removeProcesses(new Set(toRemove.map((p) => p.pid)));
    }
  };

  const cpuColor = (cpu: number) => {
    const threshold = parseFloat(prefs.cpuThreshold) || 10;
    if (cpu >= threshold) return Color.Red;
    if (cpu >= threshold / 2) return Color.Yellow;
    return Color.SecondaryText;
  };

  const memColor = (rssKb: number) => {
    const thresholdKb = (parseFloat(prefs.memThreshold) || 1024) * 1024;
    if (rssKb >= thresholdKb) return Color.Red;
    if (rssKb >= thresholdKb / 2) return Color.Yellow;
    return Color.SecondaryText;
  };

  const processDetail = (proc: Process) => {
    let ports: number[] = [];
    try {
      ports = getProcessPorts(proc.pid);
    } catch {
      // ignore
    }

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={proc.name} />
            {proc.appName && (
              <List.Item.Detail.Metadata.Label
                title="App"
                text={proc.appName}
              />
            )}
            <List.Item.Detail.Metadata.Label
              title="PID"
              text={String(proc.pid)}
            />
            <List.Item.Detail.Metadata.Label
              title="Parent PID"
              text={String(proc.ppid)}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="CPU"
              text={formatCpu(proc.cpu)}
            />
            <List.Item.Detail.Metadata.Label
              title="Memory"
              text={formatMem(proc.rss)}
            />
            <List.Item.Detail.Metadata.Label
              title="Memory %"
              text={`${proc.memPercent.toFixed(1)}%`}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Nice"
              text={String(proc.nice)}
            />
            <List.Item.Detail.Metadata.Label
              title="Uptime"
              text={formatElapsed(proc.elapsed)}
            />
            <List.Item.Detail.Metadata.Label title="Type" text={proc.type} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Path" text={proc.comm} />
            {ports.length > 0 && (
              <List.Item.Detail.Metadata.Label
                title="Ports"
                text={ports.join(", ")}
              />
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  const renderItem = (proc: Process) => {
    const icon = getProcessIcon(proc);
    const isChecked = isSelected(proc.pid);
    const dupes = findDuplicates(processes);
    const hasDupes = dupes.has(proc.name);

    const accessories: List.Item.Accessory[] = [];
    if (isChecked) {
      accessories.push({
        icon: { source: Icon.Checkmark, tintColor: Color.Green },
        tooltip: "Selected",
      });
    }
    if (proc.frozen) {
      accessories.push({ tag: { value: "FROZEN", color: Color.Blue } });
    }
    accessories.push({
      tag: { value: formatCpu(proc.cpu), color: cpuColor(proc.cpu) },
      tooltip: "CPU",
    });
    accessories.push({
      tag: { value: formatMem(proc.rss), color: memColor(proc.rss) },
      tooltip: "Memory",
    });

    const subtitle = prefs.showPid ? `${proc.pid}` : undefined;

    return (
      <List.Item
        key={proc.pid}
        title={proc.name}
        subtitle={subtitle}
        icon={icon}
        accessories={accessories}
        keywords={[proc.name, proc.comm, String(proc.pid), proc.appName ?? ""]}
        detail={showDetail ? processDetail(proc) : undefined}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Kill">
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
                title="Force Kill (Sudo)"
                icon={Icon.ExclamationMark}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                onAction={() => handleSudoKill(proc)}
              />
              {hasDupes && (
                <Action
                  title="Kill Duplicates"
                  icon={Icon.Layers}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
                  onAction={() => handleKillDuplicates(proc)}
                />
              )}
            </ActionPanel.Section>

            <ActionPanel.Section title="Multi-Select">
              <Action
                title={isChecked ? "Deselect" : "Select"}
                icon={isChecked ? Icon.CircleDisabled : Icon.Checkmark}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => toggle(proc.pid)}
              />
              <Action
                title="Select All Visible"
                icon={Icon.CheckList}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={() => selectAll(processes.map((p) => p.pid))}
              />
              {selectedCount > 0 && (
                <>
                  <Action
                    title={`Kill Selected (${selectedCount})`}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    onAction={() => handleKillSelected(false)}
                  />
                  <Action
                    title={`Force Kill Selected (${selectedCount})`}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "k" }}
                    onAction={() => handleKillSelected(true)}
                  />
                  <Action
                    title="Clear Selection"
                    icon={Icon.XMarkCircle}
                    onAction={clearSelection}
                  />
                </>
              )}
            </ActionPanel.Section>

            <ActionPanel.Section title="Bulk">
              <Action
                title="Kill All Visible"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "k" }}
                onAction={() => handleKillAll(false)}
              />
              <Action
                title="Force Kill All Visible"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl", "shift", "opt"], key: "k" }}
                onAction={() => handleKillAll(true)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Control">
              <Action
                title={proc.frozen ? "Resume" : "Freeze"}
                icon={proc.frozen ? Icon.Play : Icon.Pause}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() =>
                  proc.frozen ? resumeProcess(proc) : freezeProcess(proc)
                }
              />
              <Action
                title="Raise Priority"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                onAction={() => reniceProcess(proc, -5)}
              />
              <Action
                title="Lower Priority"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                onAction={() => reniceProcess(proc, 5)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Info">
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
              <Action.CopyToClipboard
                title="Copy Path"
                content={proc.comm}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action.CopyToClipboard
                title="Copy Process Info"
                content={`${proc.name} (PID: ${proc.pid})\nPath: ${proc.comm}\nCPU: ${formatCpu(proc.cpu)}\nMemory: ${formatMem(proc.rss)}\nUptime: ${formatElapsed(proc.elapsed)}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const sortDropdown = (
    <List.Dropdown
      tooltip="Sort & Group"
      storeValue
      onChange={(val) => {
        if (val.startsWith("sort-")) {
          setSortField(val.replace("sort-", "") as SortField);
        } else if (val.startsWith("group-")) {
          setGroupMode(val.replace("group-", "") as GroupMode);
        }
      }}
    >
      <List.Dropdown.Section title="Sort By">
        <List.Dropdown.Item title="CPU Usage" value="sort-cpu" />
        <List.Dropdown.Item title="Memory Usage" value="sort-mem" />
        <List.Dropdown.Item title="PID" value="sort-pid" />
        <List.Dropdown.Item title="Name" value="sort-name" />
        <List.Dropdown.Item title="Type" value="sort-type" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Group By">
        <List.Dropdown.Item title="No Grouping" value="group-none" />
        <List.Dropdown.Item
          title="Type (App/System/Helper)"
          value="group-type"
        />
        <List.Dropdown.Item title="Parent Process" value="group-parent" />
        <List.Dropdown.Item
          title="Usage Tier (Hog/Normal/Idle)"
          value="group-usage-tier"
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter processes..."
      isShowingDetail={showDetail}
      searchBarAccessory={sortDropdown}
    >
      {groups.map((group) => (
        <List.Section
          key={group.key}
          title={group.label}
          subtitle={`${group.processes.length} processes — CPU: ${formatCpu(group.aggregateCpu)} — Mem: ${formatMem(group.aggregateMem)}`}
        >
          {group.processes.map(renderItem)}
        </List.Section>
      ))}
    </List>
  );
}
