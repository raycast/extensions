import { ActionPanel, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import sitDown from "./sit-down";
import standUp from "./stand-up";
import { BrowserIcon, isDeskControllerInstalled, SitDownIcon, StandUpIcon } from "./utils";

export default function Command() {
  const [isInstalled, setInstalled] = useState<boolean>(true);

  useEffect(() => {
    const getDektopControllerInstalledInfo = async () => {
      setInstalled(await isDeskControllerInstalled());
    };

    getDektopControllerInstalledInfo();
  }, []);

  return (
    <List navigationTitle="Ikea Idasen">
      <List.Item
        icon={StandUpIcon}
        title="Stand Up"
        actions={
          <ActionPanel>
            <Action title="StandUp" onAction={standUp} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={SitDownIcon}
        title="Sit Down"
        actions={
          <ActionPanel>
            <Action title="SitDown" onAction={sitDown} />
          </ActionPanel>
        }
      />
      {!isInstalled && (
        <List.Item
          icon={BrowserIcon}
          title="Download app from github"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://github.com/DWilliames/idasen-controller-mac" />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
