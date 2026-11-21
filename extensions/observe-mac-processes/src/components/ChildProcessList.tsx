import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { useState } from "react";
import { ChildProcessInfo, ProcessBundle } from "../types";
import {
  killProcessByPid,
  openBrowserTaskManager,
} from "../utils/browser-manager";
import { formatBytes, formatCpu } from "../utils/formatters";

interface Props {
  bundle: ProcessBundle;
  onRefresh: () => void;
}

export function ChildProcessList({ bundle, onRefresh }: Props) {
  const [children, setChildren] = useState<ChildProcessInfo[]>(bundle.children);

  async function handleKill(pid: number, signal: "SIGTERM" | "SIGKILL") {
    const confirmed = await confirmAlert({
      title: `Terminate Process ${pid}?`,
      message: `Send ${signal} to this child worker (${bundle.name})?`,
      primaryAction: {
        title: "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const success = await killProcessByPid(pid, signal);
      if (success) {
        setChildren((prev) => prev.filter((p) => p.pid !== pid));
        onRefresh();
      }
    }
  }

  return (
    <List
      navigationTitle={`${bundle.name} Workers (${children.length})`}
      searchBarPlaceholder="Filter child workers by label, PID, or arguments..."
      isShowingDetail
    >
      {children.map((child) => {
        const isHot = child.cpu >= 15.0;
        const cpuColor = isHot
          ? Color.Red
          : child.cpu > 5.0
            ? Color.Orange
            : Color.SecondaryText;

        return (
          <List.Item
            key={child.pid}
            id={String(child.pid)}
            title={child.functionalLabel}
            subtitle={`PID ${child.pid}`}
            icon={{
              source: isHot ? Icon.ExclamationMark : Icon.Dot,
              tintColor: isHot ? Color.Red : Color.Blue,
            }}
            accessories={[
              {
                text: {
                  value: formatCpu(child.cpu),
                  color: cpuColor,
                },
                icon: Icon.Gauge,
              },
              {
                text: formatBytes(child.rssBytes),
                icon: Icon.MemoryChip,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`### ${child.functionalLabel}
${isHot ? "**Warning: High CPU Worker**\n" : ""}
- **Process ID (PID):** \`${child.pid}\`
- **Parent Process ID (PPID):** \`${child.ppid}\`
- **CPU Usage:** \`${formatCpu(child.cpu)}\`
- **Resident Memory:** \`${formatBytes(child.rssBytes)}\`

#### Command Arguments
\`\`\`bash
${child.command}
\`\`\`
`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Functional Role"
                      text={child.functionalLabel}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="PID"
                      text={String(child.pid)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="PPID"
                      text={String(child.ppid)}
                    />
                    <List.Item.Detail.Metadata.TagList title="CPU Load">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={formatCpu(child.cpu)}
                        color={cpuColor}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Memory RSS"
                      text={formatBytes(child.rssBytes)}
                    />
                    {bundle.browserType && (
                      <List.Item.Detail.Metadata.Label
                        title="Browser Engine"
                        text={bundle.browserType.toUpperCase()}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {bundle.browserType ? (
                  <Action
                    title="Open Browser Task Manager"
                    icon={Icon.Globe}
                    onAction={() => openBrowserTaskManager(bundle.browserType!)}
                  />
                ) : (
                  <Action
                    title="Terminate Worker (SIGTERM)"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleKill(child.pid, "SIGTERM")}
                  />
                )}
                {bundle.browserType && (
                  <Action
                    title="Terminate Worker (SIGTERM)"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    onAction={() => handleKill(child.pid, "SIGTERM")}
                  />
                )}
                <Action
                  title="Force Kill Worker (SIGKILL)"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
                  onAction={() => handleKill(child.pid, "SIGKILL")}
                />
                <Action.CopyToClipboard
                  title="Copy PID"
                  content={String(child.pid)}
                />
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={child.command}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
