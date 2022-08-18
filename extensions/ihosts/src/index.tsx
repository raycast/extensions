import { ActionPanel, Detail, List, Action, Icon, Color, LocalStorage, confirmAlert } from "@raycast/api";
import fs from "node:fs";
import { useEffect, useState } from "react";
import { HostFolderMode, State, SystemHostBackupKey, SystemHostFilePath, SystemHostHashKey } from "./const";
import { v4 as uuidv4 } from "uuid";
import { convertFolders2Common, getSysHostFile, getSysHostFileHash } from "./utils";

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
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [hostFoldersState, updateHostFoldersStateState] = useState<IHostFolder[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    updateLoadingState(true);
    const sysHostHash = (await LocalStorage.getItem(SystemHostHashKey)) || (await isFirstTime());
    if (sysHostHash !== getSysHostFileHash()) {
      await confirmAlert({
        icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
        title: `The file ${SystemHostFilePath} has been edited by other software!`,
        message: `You can back up the current ${SystemHostFilePath} file`,
        dismissAction: {
          title: "Overwrite",
          onAction: async () => {
            await refresh();
            updateLoadingState(false);
          },
        },
        primaryAction: {
          title: "Backup",
          onAction: async () => {
            await backupHostFile();
            await refresh();
            updateLoadingState(false);
          },
        },
      });
      return;
    }
    await refresh();
    updateLoadingState(false);
  }

  async function refresh() {
    console.log("加载所有host");
    console.log("计算写入host文件");
    console.log("渲染UI");
  }

  return (
    <List isLoading={isLoadingState}>
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
  } else {
    if (item.folderState == State.Disable) {
      accessories.push({
        icon: { source: Icon.Info, tintColor: Color.SecondaryText },
        tooltip: "This item is not active because the current folder is disabled",
      });
    }
  }
  return accessories;
}

async function isFirstTime(): Promise<string> {
  const id = uuidv4();
  await LocalStorage.setItem(
    id,
    JSON.stringify({
      id: uuidv4(),
      name: "Default",
      state: State.Disable,
      mode: HostFolderMode.Multiple,
      hosts: [],
    })
  );
  const sysHostFileHash = getSysHostFileHash();
  await LocalStorage.setItem(SystemHostHashKey, sysHostFileHash);
  return sysHostFileHash;
}

async function backupHostFile() {
  await LocalStorage.setItem(SystemHostBackupKey, getSysHostFile());
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
