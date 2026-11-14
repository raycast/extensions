import { Color, Icon, LocalStorage, MenuBarExtra, showHUD } from "@raycast/api";
import { getItemIcon } from "./component";
import { HostFolderMode, HostInactiveByFolderTip, State, SystemHostHashKey } from "./const";
import { getHostCommonsCache, saveHostCommons } from "./utils/common";
import {
  checkSysHostAccess,
  getContentFromUrl,
  getSysHostAccess,
  getSysHostPermissionErrorMessage,
  getSysHostFileHash,
  writeSysHostFile,
} from "./utils/file";
import { useState } from "react";

export default function Command() {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [hasHostAccess, setHasHostAccess] = useState(checkSysHostAccess);

  if (!hasHostAccess) {
    return (
      <MenuBarExtra
        icon={{
          source: "switch.png",
          tintColor: Color.PrimaryText,
        }}
      >
        <MenuBarExtra.Item title="Enable hosts editing for your macOS account" />
        <MenuBarExtra.Item title="Other apps running as your account will also have access" />
        <MenuBarExtra.Item
          title={isLoadingState ? "Waiting for macOS authorization…" : "Enable Hosts Access"}
          icon={{ source: Icon.Fingerprint, tintColor: Color.Red }}
          onAction={async () => {
            if (isLoadingState) return;
            updateLoadingState(true);
            try {
              await getSysHostAccess();
              setHasHostAccess(true);
              await showHUD("Hosts access enabled");
            } catch (error) {
              await showHUD(getSysHostPermissionErrorMessage(error));
            } finally {
              updateLoadingState(false);
            }
          }}
        />
      </MenuBarExtra>
    );
  }
  const hostCommonsState = getHostCommonsCache();

  async function onToggleItemState(id: string) {
    updateLoadingState(true);
    try {
      let target = hostCommonsState.find((item) => item.id === id && !item.isFolder);
      if (!target) {
        for (const folder of hostCommonsState) {
          if (!folder.isFolder) continue;
          target = folder.hosts?.find((h) => h.id === id);
          if (target) {
            if (folder && folder.mode === HostFolderMode.Single && target.state === State.Disable) {
              folder.hosts?.forEach((h) => (h.state = State.Disable));
            }
            break;
          }
        }
      }
      if (!target) return;
      target.state = target.state === State.Enable ? State.Disable : State.Enable;
      let hostContents = "# iHost\n";
      for (const item of hostCommonsState) {
        if (item.isRemote && item.url?.match(/https?:\/\//) && item.state === State.Enable) {
          item.content = await getContentFromUrl(item.url);
        }

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
      }
      await saveHostCommons(hostCommonsState);
      await writeSysHostFile(hostContents);
      await LocalStorage.setItem(SystemHostHashKey, getSysHostFileHash());
      await showHUD("Host state toggled");
    } catch (error) {
      await showHUD("opps! Something was wrong");
    } finally {
      updateLoadingState(false);
    }
  }

  return (
    <MenuBarExtra
      icon={{
        source: "switch.png",
        tintColor: Color.PrimaryText,
      }}
      isLoading={isLoadingState}
    >
      {hostCommonsState
        .filter((item) => !item.isFolder)
        .sort((a, b) => b.ctime - a.ctime)
        .map((host) => {
          return (
            <MenuBarExtra.Item
              key={host.id}
              title={host.name}
              icon={getItemIcon(host)}
              onAction={() => onToggleItemState(host.id)}
            />
          );
        })}
      <MenuBarExtra.Separator />
      {hostCommonsState
        .filter((item) => item.isFolder && item.hosts && item.hosts.length > 0)
        .sort((a, b) => b.ctime - a.ctime)
        .map((folder) => {
          return (
            <MenuBarExtra.Submenu key={folder.id} title={`${folder.name} - ${folder.mode}`} icon={getItemIcon(folder)}>
              {folder.hosts
                ?.sort((a, b) => b.ctime - a.ctime)
                .map((host) => {
                  return (
                    <MenuBarExtra.Item
                      key={host.id}
                      title={host.name}
                      tooltip={
                        host.state === State.Enable && host.folderState === State.Disable ? HostInactiveByFolderTip : ""
                      }
                      icon={getItemIcon(host)}
                      onAction={() => onToggleItemState(host.id)}
                    />
                  );
                })}
            </MenuBarExtra.Submenu>
          );
        })}
    </MenuBarExtra>
  );
}
