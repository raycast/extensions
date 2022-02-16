import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { CopyCommandsActionsMenu } from "./actions/CopyCommandsActionMenu";
import CopyInfoActionsMenu from "./actions/CopyInfoActionsMenu";
import KillActionsMenu from "./actions/KillActionsMenu";
import KillallActionsMenu from "./actions/KillallActionsMenu";
import ProcessInfo from "./models/ProcessInfo";

export default function Command() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const reloadProcesses = async () => setProcesses(await ProcessInfo.getCurrent());

  useEffect(() => {
    (async () => {
      reloadProcesses();
    })();
  }, []);
  return (
    <List isLoading={processes.length === 0} navigationTitle="Open Ports" searchBarPlaceholder="Search Open Ports">
      {processes.map((p) => (
        <List.Item
          key={p.pid}
          title={p.name ?? "Untitled Process"}
          subtitle={p.user ?? ""}
          accessoryTitle={[...new Set(p.portInfo?.map((i) => `${i.port}`))].join(", ")}
          keywords={p.portInfo?.map((i) => `${i.port}`).concat(p.portInfo?.map((i) => `${i.host}`))}
          actions={
            <ActionPanel>
              <KillActionsMenu process={p} reloadCallback={reloadProcesses} />
              <KillallActionsMenu process={p} reloadCallback={reloadProcesses} />
              <CopyInfoActionsMenu process={p} />
              <CopyCommandsActionsMenu process={p} />
              <Action title="Reload" onAction={reloadProcesses} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
