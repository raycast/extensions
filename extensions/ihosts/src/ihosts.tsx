import { List, Icon, Color, LocalStorage, confirmAlert, showToast, Toast, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  FolderFilterDropDown,
  getItemAccessories,
  getItemActions,
  getItemIcon,
  SysHostPermRequest,
  SystemHostsActions,
} from "./component";
import { HostFolderMode, State, SystemHostBackupKey, SystemHostFilePath, SystemHostHashKey } from "./const";
import { backupHostFile, getHostCommons, isFirstTime, removeBackup, saveHostCommons } from "./utils/common";
import {
  checkSysHostAccess,
  getContentFromUrl,
  getShowHost,
  getSysHostFile,
  getSysHostFileHash,
  writeSysHostFile,
} from "./utils/file";
import { v4 as uuidv4 } from "uuid";

export default function Command() {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [hostCommonsState, updateHostCommonsState] = useState<IHostCommon[]>([]);
  const [foldersState, updateFoldersState] = useState<IHostCommon[]>([]);
  const [filterIdState, updateFilterIdState] = useState<string>("-1");
  const [hostBackupState, updateHostBackupState] = useState<IHostCommon | undefined>();
  if (!checkSysHostAccess()) {
    return <SysHostPermRequest />;
  }

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
            await refresh(true);
            updateLoadingState(false);
          },
        },
        primaryAction: {
          title: "Backup",
          onAction: async () => {
            await backupHostFile();
            await refresh(true);
            updateLoadingState(false);
          },
        },
      });
      return;
    }
    await refresh(false);
    updateLoadingState(false);
  }

  async function refresh(writeHost: boolean) {
    const backup = await LocalStorage.getItem(SystemHostBackupKey);
    if (backup) {
      updateHostBackupState(JSON.parse(backup as string));
    } else {
      updateHostBackupState(undefined);
    }
    const commonHosts = await getHostCommons();
    if (writeHost) {
      let hostContents = "# iHosts\n";
      commonHosts.forEach((item) => {
        if (!item.isFolder && item.state === State.Enable) {
          hostContents += `# ${item.name}\n ${item.content}\n\n`;
        }
        if (item.isFolder && item.state === State.Enable && item.hosts) {
          item.hosts.forEach((host) => {
            if (host.state === State.Enable) {
              hostContents += `# ${item.name} - ${host.name}\n ${host.content}\n\n`;
            }
          });
        }
      });
      await writeSysHostFile(hostContents);
      await LocalStorage.setItem(SystemHostHashKey, getSysHostFileHash());
    }
    updateHostCommonsState(commonHosts);
    updateFoldersState(commonHosts.filter((c) => c.isFolder));
  }

  function onFolderChange(selected: string) {
    updateFilterIdState(selected);
  }

  async function onNewFolder(folder: INewFolder) {
    updateLoadingState(true);
    try {
      const folderItem: IHostCommon = {
        id: uuidv4(),
        name: folder.name,
        state: State.Enable,
        mode: folder.mode,
        isFolder: true,
        isRemote: false,
        folderState: State.Enable,
        hosts: [],
        ctime: new Date().getTime(),
      };
      hostCommonsState.push(folderItem);
      await saveHostCommons(hostCommonsState);
      await refresh(false);
      showToast({
        title: "Folder created",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Failed to create folder",
        style: Toast.Style.Failure,
      });
    } finally {
      updateLoadingState(false);
    }
  }

  async function onUpsertHost(host: IUpsertHost) {
    updateLoadingState(true);
    try {
      if (host.id) {
        let target = hostCommonsState.find((item) => !item.isFolder && item.id === host.id);
        if (!target) {
          for (const item of hostCommonsState) {
            if (!item.isFolder) continue;
            target = item.hosts?.find((h) => h.id === host.id);
            if (target) break;
          }
        }
        if (!target) return;
        target.name = host.name;
        target.content = host.content;

        if (host.url && host.url?.match(/^https?:\/\//)) {
          target.url = host.url?.toString();
          target.isRemote = Boolean(host.url?.length);
          target.content = await getContentFromUrl(target.url);
        }
      } else {
        let folder: IHostCommon | undefined;
        if (host.folder !== "-1") {
          folder = hostCommonsState.find((f) => f.id === host.folder);
          if (!folder) return;
        }
        const hostItem: IHostCommon = {
          id: uuidv4(),
          name: host.name,
          isFolder: false,
          isRemote: host.url?.length ? true : false,
          state: State.Enable,
          content: host.content,
          ctime: new Date().getTime(),
          url: host.url?.toString(),
        };

        if (host.url && host.url?.match(/^https?:\/\//)) {
          hostItem.url = host.url?.toString();
          hostItem.isRemote = true;
          hostItem.content = await getContentFromUrl(hostItem.url);
        }

        if (folder && folder.mode === HostFolderMode.Single && folder.hosts?.find((h) => h.state === State.Enable)) {
          hostItem.state = State.Disable;
        }
        if (folder) {
          hostItem.folderState = folder.state;
          folder.hosts?.push(hostItem);
        } else {
          hostCommonsState.push(hostItem);
        }
      }
      await saveHostCommons(hostCommonsState);
      await refresh(true);
      showToast({
        title: "Host created",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Failed to create host",
        style: Toast.Style.Failure,
      });
    } finally {
      updateLoadingState(false);
    }
  }

  async function onToggleItemState(id: string) {
    if (isLoadingState) {
      showHUD("Please calm down⏳");
      return;
    }
    updateLoadingState(true);
    try {
      let target = hostCommonsState.find((item) => item.id === id);
      if (!target) {
        for (const item of hostCommonsState) {
          if (!item.isFolder) continue;
          target = item.hosts?.find((h) => h.id === id);
          if (target) {
            if (item && item.mode === HostFolderMode.Single && target.state === State.Disable) {
              item.hosts?.forEach((h) => (h.state = State.Disable));
            }
            break;
          }
        }
      }
      if (!target) return;
      const state = target.state === State.Enable ? State.Disable : State.Enable;
      target.state = state;
      if (target.isRemote && target.url?.match(/https?:\/\//) && target.state === State.Enable) {
        target.content = await getContentFromUrl(target.url);
      }
      if (target.isFolder) {
        target.folderState = state;
        target.hosts?.forEach((h) => (h.folderState = state));
      }
      await saveHostCommons(hostCommonsState);
      await refresh(!(target.isFolder && target.hosts?.length === 0));
      showToast({
        title: "State toggled",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Failed to toggle state",
        style: Toast.Style.Failure,
      });
    } finally {
      updateLoadingState(false);
    }
  }

  async function onDeleteItem(id: string) {
    updateLoadingState(true);
    try {
      if (hostBackupState && hostBackupState.id === id) {
        await removeBackup();
        await refresh(false);
      } else {
        const filtered = hostCommonsState.filter((item) => item.id !== id);
        for (const item of filtered) {
          if (!item.isFolder) continue;
          item.hosts = item.hosts?.filter((h) => h.id !== id);
        }
        await saveHostCommons(filtered);
        await refresh(true);
      }
      showToast({
        title: "Host deleted",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Failed to delete host",
        style: Toast.Style.Failure,
      });
    } finally {
      updateLoadingState(false);
    }
  }

  return (
    <List
      isLoading={isLoadingState}
      isShowingDetail={true}
      searchBarAccessory={<FolderFilterDropDown folders={foldersState} onFolderChange={onFolderChange} />}
    >
      <List.Item
        title={"System Hosts"}
        icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
        detail={<List.Item.Detail markdown={getShowHost(getSysHostFile())} />}
        actions={SystemHostsActions(onNewFolder, foldersState, onUpsertHost, onToggleItemState, onDeleteItem)}
      />
      {hostBackupState && (
        <List.Item
          title={hostBackupState.name}
          icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.SecondaryText }}
          accessories={[{ date: new Date(hostBackupState.ctime) }]}
          detail={<List.Item.Detail markdown={getShowHost(hostBackupState.content || "")} />}
          actions={getItemActions(
            hostBackupState,
            onNewFolder,
            foldersState,
            onUpsertHost,
            onToggleItemState,
            onDeleteItem
          )}
        ></List.Item>
      )}
      {filterIdState === "-1" &&
        hostCommonsState
          .filter((item) => !item.isFolder)
          .sort((a, b) => b.ctime - a.ctime)
          .map((item) => {
            return (
              <List.Item
                key={item.id}
                title={item.name}
                icon={getItemIcon(item)}
                accessories={getItemAccessories(item)}
                detail={<List.Item.Detail markdown={getShowHost(item.content || "")} />}
                actions={getItemActions(item, onNewFolder, foldersState, onUpsertHost, onToggleItemState, onDeleteItem)}
              ></List.Item>
            );
          })}
      {hostCommonsState
        .filter(
          (item) =>
            (filterIdState === "-1" && item.isFolder) ||
            (filterIdState !== "-1" && item.isFolder && item.id === filterIdState)
        )
        .sort((a, b) => b.ctime - a.ctime)
        .map((folder) => {
          return (
            <List.Section key={folder.id} title={folder.name} subtitle={`Folder | ${folder.mode}`}>
              {folder.hosts
                ?.sort((a, b) => b.ctime - a.ctime)
                .map((host) => {
                  return (
                    <List.Item
                      key={host.id}
                      title={host.name}
                      icon={getItemIcon(host)}
                      accessories={getItemAccessories(host)}
                      detail={<List.Item.Detail markdown={getShowHost(host.content || "")} />}
                      actions={getItemActions(
                        host,
                        onNewFolder,
                        foldersState,
                        onUpsertHost,
                        onToggleItemState,
                        onDeleteItem
                      )}
                    ></List.Item>
                  );
                })}
            </List.Section>
          );
        })}
    </List>
  );
}
