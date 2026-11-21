import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChildProcessList } from "./components/ChildProcessList";
import { FilterCategory, ProcessBundle, SortOrder } from "./types";
import {
  killProcessByPid,
  openBrowserTaskManager,
  openInActivityMonitor,
} from "./utils/browser-manager";
import { formatBytes, formatCpu, truncate } from "./utils/formatters";
import { snapshotProcesses } from "./utils/process-manager";

export default function Command() {
  const [bundles, setBundles] = useState<ProcessBundle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("cpu");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const refreshProcesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await snapshotProcesses();
      setBundles(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to snapshot processes",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProcesses();
  }, [refreshProcesses]);

  const filteredAndSortedBundles = useMemo(() => {
    let result = bundles.slice();

    if (filterCategory === "browser") {
      result = result.filter((b) => b.category === "browser");
    } else if (filterCategory === "developer") {
      result = result.filter((b) => b.category === "developer");
    } else if (filterCategory === "system") {
      result = result.filter((b) => b.category === "system");
    } else if (filterCategory === "hot") {
      result = result.filter((b) => b.totalCpu >= 15.0);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter((b) => {
        if (b.name.toLowerCase().includes(query)) {
          return true;
        }
        if (b.bundlePath && b.bundlePath.toLowerCase().includes(query)) {
          return true;
        }
        if (String(b.mainPid).includes(query)) {
          return true;
        }
        return b.children.some(
          (c) =>
            c.functionalLabel.toLowerCase().includes(query) ||
            String(c.pid).includes(query) ||
            c.command.toLowerCase().includes(query),
        );
      });
    }

    result.sort((a, b) => {
      if (sortOrder === "cpu") {
        return b.totalCpu - a.totalCpu || b.totalRssBytes - a.totalRssBytes;
      }
      if (sortOrder === "memory") {
        return b.totalRssBytes - a.totalRssBytes || b.totalCpu - a.totalCpu;
      }
      if (sortOrder === "children") {
        return b.processCount - a.processCount || b.totalCpu - a.totalCpu;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [bundles, filterCategory, sortOrder, searchText]);

  async function handleKillHotWorker(bundle: ProcessBundle) {
    if (!bundle.hotWorker) {
      return;
    }
    const confirmed = await confirmAlert({
      title: `Terminate Hot Worker (PID ${bundle.hotWorker.pid})?`,
      message: `${bundle.hotWorker.functionalLabel} is consuming ${formatCpu(bundle.hotWorker.cpu)} in ${bundle.name}.`,
      primaryAction: {
        title: "Terminate Worker",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await killProcessByPid(bundle.hotWorker.pid, "SIGTERM");
      await refreshProcesses();
    }
  }

  async function handleKillEntireBundle(bundle: ProcessBundle) {
    const confirmed = await confirmAlert({
      title: `Terminate ${bundle.name}?`,
      message: `This will terminate all ${bundle.processCount} rolled-up processes.`,
      primaryAction: {
        title: "Terminate All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      for (const child of bundle.children) {
        await killProcessByPid(child.pid, "SIGTERM");
      }
      await refreshProcesses();
    }
  }

  function getBundleIcon(bundle: ProcessBundle): Image.ImageLike {
    if (bundle.bundlePath) {
      return { fileIcon: bundle.bundlePath };
    }
    if (bundle.category === "browser") {
      return Icon.Globe;
    }
    if (bundle.category === "developer") {
      return Icon.Terminal;
    }
    if (bundle.category === "system") {
      return Icon.Gear;
    }
    return Icon.Window;
  }

  function renderDetail(bundle: ProcessBundle) {
    const hotWorkerText = bundle.hotWorker
      ? `> **Hottest Child Process**
> - **Role:** ${bundle.hotWorker.functionalLabel}
> - **PID:** \`${bundle.hotWorker.pid}\`
> - **CPU:** \`${formatCpu(bundle.hotWorker.cpu)}\` | **RAM:** \`${formatBytes(bundle.hotWorker.rssBytes)}\`
`
      : "";

    const workersListText = bundle.children
      .slice(0, 8)
      .map(
        (c) =>
          `- **${c.functionalLabel}** (PID \`${c.pid}\`): \`${formatCpu(c.cpu)}\` CPU, \`${formatBytes(c.rssBytes)}\` RAM`,
      )
      .join("\n");

    const moreWorkersCount = bundle.children.length - 8;
    const moreText =
      moreWorkersCount > 0
        ? `\n- *...and ${moreWorkersCount} more child processes*`
        : "";

    const browserActionNotice = bundle.browserType
      ? `\n**Single-Keystroke Action:** Hit Enter to launch ${
          bundle.browserType === "firefox"
            ? "about:processes"
            : "in-browser task manager"
        }.`
      : "";

    return (
      <List.Item.Detail
        markdown={`## ${bundle.name}
**Cumulative CPU:** \`${formatCpu(bundle.totalCpu)}\` &nbsp;|&nbsp; **Cumulative RAM:** \`${formatBytes(
          bundle.totalRssBytes,
        )}\` &nbsp;|&nbsp; **Total Processes:** \`${bundle.processCount}\`
${browserActionNotice}

${hotWorkerText}

### Rolled-Up Processes (${bundle.children.length})
${workersListText}${moreText}
`}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Application Bundle"
              text={bundle.name}
            />
            <List.Item.Detail.Metadata.Label
              title="Root PID"
              text={String(bundle.mainPid)}
            />
            <List.Item.Detail.Metadata.TagList title="Total CPU">
              <List.Item.Detail.Metadata.TagList.Item
                text={formatCpu(bundle.totalCpu)}
                color={
                  bundle.totalCpu >= 100
                    ? Color.Red
                    : bundle.totalCpu >= 30
                      ? Color.Orange
                      : Color.SecondaryText
                }
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Label
              title="Total Memory"
              text={formatBytes(bundle.totalRssBytes)}
            />
            <List.Item.Detail.Metadata.Label
              title="Rolled-Up Workers"
              text={`${bundle.processCount} processes`}
            />
            {bundle.browserType && (
              <List.Item.Detail.Metadata.TagList title="Task Manager Deep Link">
                <List.Item.Detail.Metadata.TagList.Item
                  text={
                    bundle.browserType === "firefox"
                      ? "about:processes"
                      : "Browser Task Manager"
                  }
                  color={Color.Blue}
                />
              </List.Item.Detail.Metadata.TagList>
            )}
            {bundle.bundlePath && (
              <List.Item.Detail.Metadata.Label
                title="Bundle Path"
                text={truncate(bundle.bundlePath, 42)}
              />
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter applications by name, child label (e.g. 'Tab Worker'), or PID..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Category"
          value={filterCategory}
          onChange={(val) => setFilterCategory(val as FilterCategory)}
        >
          <List.Dropdown.Item
            title="All Applications"
            value="all"
            icon={Icon.AppWindow}
          />
          <List.Dropdown.Item
            title="High CPU (> 15%)"
            value="hot"
            icon={Icon.Gauge}
          />
          <List.Dropdown.Item
            title="Browsers"
            value="browser"
            icon={Icon.Globe}
          />
          <List.Dropdown.Item
            title="Developer Tools"
            value="developer"
            icon={Icon.Terminal}
          />
          <List.Dropdown.Item
            title="System Services"
            value="system"
            icon={Icon.Gear}
          />
        </List.Dropdown>
      }
    >
      <List.Section
        title={`Active Bundles (${filteredAndSortedBundles.length})`}
      >
        {filteredAndSortedBundles.map((bundle) => {
          const isHot = bundle.totalCpu >= 20.0;
          const cpuColor =
            bundle.totalCpu >= 100
              ? Color.Red
              : bundle.totalCpu >= 20
                ? Color.Orange
                : Color.SecondaryText;

          const hotSubtitle =
            bundle.hotWorker && bundle.processCount > 1
              ? `${bundle.processCount} procs | Hot: ${bundle.hotWorker.functionalLabel} (${formatCpu(
                  bundle.hotWorker.cpu,
                )})`
              : `${bundle.processCount} ${bundle.processCount === 1 ? "proc" : "procs"}`;

          return (
            <List.Item
              key={bundle.id}
              id={bundle.id}
              title={bundle.name}
              subtitle={isShowingDetail ? undefined : hotSubtitle}
              icon={getBundleIcon(bundle)}
              accessories={
                isShowingDetail
                  ? [
                      {
                        text: {
                          value: formatCpu(bundle.totalCpu),
                          color: cpuColor,
                        },
                        icon: isHot ? Icon.Gauge : undefined,
                      },
                      {
                        text: formatBytes(bundle.totalRssBytes),
                      },
                    ]
                  : [
                      {
                        text: {
                          value: formatCpu(bundle.totalCpu),
                          color: cpuColor,
                        },
                        icon: isHot ? Icon.Gauge : undefined,
                      },
                      {
                        text: formatBytes(bundle.totalRssBytes),
                        icon: Icon.MemoryChip,
                      },
                      {
                        tag: {
                          value: `${bundle.processCount} procs`,
                          color: Color.SecondaryText,
                        },
                      },
                    ]
              }
              detail={renderDetail(bundle)}
              actions={
                <ActionPanel>
                  {bundle.browserType ? (
                    <Action
                      title={`Open ${bundle.browserType === "firefox" ? "about:processes" : "Browser Task Manager"}`}
                      icon={Icon.Globe}
                      onAction={() =>
                        openBrowserTaskManager(bundle.browserType!)
                      }
                    />
                  ) : (
                    <Action.Push
                      title="View Child Workers"
                      icon={Icon.List}
                      target={
                        <ChildProcessList
                          bundle={bundle}
                          onRefresh={refreshProcesses}
                        />
                      }
                    />
                  )}

                  {bundle.browserType && (
                    <Action.Push
                      title="View Child Workers"
                      icon={Icon.List}
                      target={
                        <ChildProcessList
                          bundle={bundle}
                          onRefresh={refreshProcesses}
                        />
                      }
                    />
                  )}

                  {bundle.hotWorker && (
                    <Action
                      title="Kill Hot Worker"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                      onAction={() => handleKillHotWorker(bundle)}
                    />
                  )}

                  <Action
                    title="Kill Entire App Bundle"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
                    onAction={() => handleKillEntireBundle(bundle)}
                  />

                  <Action
                    title="Reveal in Activity Monitor"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => openInActivityMonitor()}
                  />

                  <ActionPanel.Section title="Display & Sorting">
                    <Action
                      title={`Sort by CPU (${sortOrder === "cpu" ? "Active" : "Switch"})`}
                      icon={Icon.Gauge}
                      onAction={() => setSortOrder("cpu")}
                    />
                    <Action
                      title={`Sort by Memory (${sortOrder === "memory" ? "Active" : "Switch"})`}
                      icon={Icon.MemoryChip}
                      onAction={() => setSortOrder("memory")}
                    />
                    <Action
                      title={`Sort by Process Count (${sortOrder === "children" ? "Active" : "Switch"})`}
                      icon={Icon.List}
                      onAction={() => setSortOrder("children")}
                    />
                    <Action
                      title={`Sort by Name (${sortOrder === "name" ? "Active" : "Switch"})`}
                      icon={Icon.Text}
                      onAction={() => setSortOrder("name")}
                    />
                    <Action
                      title={isShowingDetail ? "Hide Details" : "Show Details"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setIsShowingDetail(!isShowingDetail)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refreshProcesses}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Diagnostics">
                    <Action.CopyToClipboard
                      title="Copy Diagnostic Summary"
                      content={`${bundle.name} (PID ${bundle.mainPid})
Total CPU: ${formatCpu(bundle.totalCpu)}
Total Memory: ${formatBytes(bundle.totalRssBytes)}
Processes: ${bundle.processCount}
${bundle.hotWorker ? `Hot Worker: ${bundle.hotWorker.functionalLabel} (PID ${bundle.hotWorker.pid}, ${formatCpu(bundle.hotWorker.cpu)})` : ""}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy Bundle Path"
                      content={bundle.bundlePath || bundle.name}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
