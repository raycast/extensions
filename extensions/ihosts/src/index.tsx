import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import fs from "node:fs";
import { useEffect } from "react";
import { HostFolderMode, State } from "./const";
import { v4 as uuidv4 } from "uuid";
import { convertFolders2Common } from "./utils";

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

  function getItemIcon(item: IHostCommon) {
    if (!item.isFolder) {
      if (item.state == State.Disable) {
        return {
          source: Icon.Circle,
          tintColor: item.folderState === State.Disable ? Color.SecondaryText : Color.Green,
        };
      } else {
        return {
          source: Icon.CheckCircle,
          tintColor: item.folderState === State.Disable ? Color.SecondaryText : Color.Green,
        };
      }
    }
  }

  function getItemAccessories(item: IHostCommon) {
    const accessories = [];
    if (item.isFolder) {
      if (item.state == State.Enable) {
        accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green } });
      } else {
        accessories.push({ icon: { source: Icon.Circle, tintColor: Color.Green } });
      }
      accessories.push({ text: `Folder` });
    }
    return accessories;
  }

  return (
    <List>
      <List.Item
        title={"System Hosts"}
        icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
        actions={systemHostsActions(false)}
      />
      {convertFolders2Common(hostFolders).map((item) => {
        return (
          <List.Item title={item.name} icon={getItemIcon(item)} accessories={getItemAccessories(item)}></List.Item>
        );
      })}
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
