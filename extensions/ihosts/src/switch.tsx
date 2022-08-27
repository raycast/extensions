import { Color, LocalStorage, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { getItemIcon } from "./component";
import { HostsCommonKey } from "./const";

export default function Command() {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [hostCommonsState, updateHostCommonsState] = useState<IHostCommon[]>([]);
  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      updateLoadingState(true);
      let commonHosts: IHostCommon[] = [];
      // TODO Cache
      const hosts = await LocalStorage.getItem(HostsCommonKey);
      if (hosts) {
        commonHosts = JSON.parse(hosts as string);
      }
      updateHostCommonsState(commonHosts);
    } catch (error) {
      console.log(error);
    }
    updateLoadingState(false);
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
              onAction={() => {
                console.log("seen pull request clicked");
              }}
            />
          );
        })}
      <MenuBarExtra.Separator />
      {hostCommonsState
        .filter((item) => item.isFolder && item.hosts && item.hosts.length > 0)
        .sort((a, b) => b.ctime - a.ctime)
        .map((folder) => {
          return (
            <MenuBarExtra.Submenu key={folder.id} title={folder.name} icon={getItemIcon(folder, true)}>
              {folder.hosts
                ?.sort((a, b) => b.ctime - a.ctime)
                .map((host) => {
                  return (
                    <MenuBarExtra.Item
                      key={host.id}
                      title={host.name}
                      icon={getItemIcon(host)}
                      onAction={() => {
                        console.log("seen pull request clicked");
                      }}
                    />
                  );
                })}
            </MenuBarExtra.Submenu>
          );
        })}
    </MenuBarExtra>
  );
}
