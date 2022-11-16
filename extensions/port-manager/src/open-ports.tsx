import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useState } from "react";
import { CopyCommandsActionsMenu } from "./actions/CopyCommandsActionMenu";
import CopyInfoActionsMenu from "./actions/CopyInfoActionsMenu";
import KillActionsMenu from "./actions/KillActionsMenu";
import KillallActionsMenu from "./actions/KillallActionsMenu";
import KillParentActionsMenu, { IProcessInfoWithParent } from "./actions/KillParentActions";
import { ShowInFinderActionMenu } from "./actions/ShowInFinderActionMenu";
import useProcessInfo from "./hooks/useProcessInfo";

export default function Command() {
  const [processes, reloadProcesses] = useProcessInfo();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <List
      isShowingDetail={showInfo}
      isLoading={processes.length === 0}
      navigationTitle="Kill Port"
      searchBarPlaceholder="Search Open Ports"
    >
      {processes.map((p) => (
        <List.Item
          key={p.pid}
          title={p.name ?? "Untitled Process"}
          subtitle={showInfo ? "" : p.user ?? ""}
          keywords={p.portInfo?.map((i) => `${i.port}`).concat(p.portInfo?.map((i) => `${i.host}`))}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label key={1} title="Info" />
                  <List.Item.Detail.Metadata.Separator key={2} />
                  <List.Item.Detail.Metadata.Label key={3} title="Name" text={p.name} />
                  <List.Item.Detail.Metadata.Label key={4} title="User" text={`${p.user} (${p.uid})`} />
                  <List.Item.Detail.Metadata.Label key={5} title="PID" text={`${p.pid}`} />
                  {p.path !== undefined && <List.Item.Detail.Metadata.Label key={6} title="Path" text={p.path} />}
                  <List.Item.Detail.Metadata.Label key={7} title="Parent PID" text={`${p.parentPid}`} />
                  {p.parentPath !== undefined && (
                    <List.Item.Detail.Metadata.Label key={8} title="Parent Path" text={p.parentPath} />
                  )}
                  <List.Item.Detail.Metadata.Label key={9} title="Protocol" text={`${p.protocol}`} />
                  <List.Item.Detail.Metadata.Label key={10} title="" />
                  <List.Item.Detail.Metadata.Label key={11} title="Ports" />
                  <List.Item.Detail.Metadata.Separator key={12} />
                  {p.portInfo?.map((i, index) => (
                    <List.Item.Detail.Metadata.Label key={13 + index} title={i.host} text={`${i.port}`} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <KillActionsMenu process={p} reloadCallback={reloadProcesses} />
              <KillallActionsMenu process={p} reloadCallback={reloadProcesses} />
              {p.parentPid !== undefined && p.parentPid !== 1 && (
                <KillParentActionsMenu process={p as IProcessInfoWithParent} reloadCallback={reloadProcesses} />
              )}
              <Action
                title="Show Info"
                icon={Icon.QuestionMark}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => setShowInfo(!showInfo)}
              />
              <ShowInFinderActionMenu process={p} />
              <CopyInfoActionsMenu process={p} />
              <CopyCommandsActionsMenu process={p} />
              <Action title="Reload" onAction={reloadProcesses} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
          accessories={
            showInfo
              ? []
              : [
                  {
                    text: [...new Set(p.portInfo?.map((i) => `${i.port}`))].join(", "),
                  },
                ]
          }
        />
      ))}
    </List>
  );
}
