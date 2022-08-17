import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import fs from "node:fs";
import { useEffect } from "react";
import { HostFolderMode, State } from "./const";
import { v4 as uuidv4 } from "uuid";

const hostFolders: IHostFolder[] = [
  {
    id: uuidv4(),
    name: "Default",
    state: State.Disable,
    mode: HostFolderMode.Multiple,
    hosts: [
      {
        id: uuidv4(),
        name: "Uat",
        state: State.Disable,
        content: "Uat hosts",
      },
      {
        id: uuidv4(),
        name: "Pre",
        state: State.Enable,
        content: "Pre hosts",
      },
      {
        id: uuidv4(),
        name: "Prod",
        state: State.Enable,
        content: "Prod hosts",
      },
    ],
  },
  {
    id: uuidv4(),
    name: "Test",
    state: State.Enable,
    mode: HostFolderMode.Single,
    hosts: [
      {
        id: uuidv4(),
        name: "Test1",
        state: State.Disable,
        content: "Test1 hosts",
      },
      {
        id: uuidv4(),
        name: "Test2",
        state: State.Enable,
        content: "Test2 hosts",
      },
    ],
  },
];

export default function Command() {
  useEffect(() => {
    uuidv4();
    console.log("start");
  }, []);

  return (
    <List>
      <List.Item
        title={"System Hosts"}
        icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
        actions={systemHostsActions(false)}
      />
      {hostFolders.map((folder) => {
        return (
          <List.Item title={folder.name}></List.Item>
          // {folder.hosts.map((host) => {
          //   return <List.Item title={host.name}></List.Item>
          // })}
        );
      })}
      {/* 
      <List.Item title={"Uat"} icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
      <List.Item title={"Pre"} icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
      <List.Item title={"Prod"} icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} /> */}
    </List>
  );
}

function systemHostsDetail() {
  const systemHostsMd = fs.readFileSync("/etc/hosts", "utf8");
  return <Detail markdown={systemHostsMd} actions={systemHostsActions(true)} />;
}

function systemHostsActions(isDetail: boolean) {
  return (
    <ActionPanel>
      {!isDetail && <Action.Push title="Show Detail" target={systemHostsDetail()} />}
      <Action.OpenWith path={"/etc/hosts"} />
    </ActionPanel>
  );
}
