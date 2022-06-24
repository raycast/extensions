import { ActionPanel, List, Action, Icon, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import sitDown from "./sit-down";
import standUp from "./stand-up";
import { isDeskControllerInstalled } from "./utils";
import setDeskToPosition from "./set-desk-to";

export default function Command () {
  const [searchText, setSearchText] = useState<string>('');
  const [deskHeight, setDeskHeight] = useState<number>(80);
  const [isInstalled, setInstalled] = useState<boolean>(true);

  useEffect(() => {
    const getDesktopControllerInstalledInfo = async () => {
      setInstalled(await isDeskControllerInstalled());
    };

    getDesktopControllerInstalledInfo();
  }, []);


  return (
    <List
      searchText={searchText}
      onSearchTextChange={(n) => {
        setDeskHeight(Number(n.match(/\d+/)?.[0] ?? 80))
        setSearchText(n);
      }}
      searchBarPlaceholder='Set desk to 120cm'
      navigationTitle="Ikea Idasen"
    >
      {!searchText &&
        <List.Item
          icon={Icon.ChevronUp}
          title="Stand Up"
          actions={
            <ActionPanel>
              <Action title="Stand Up" onAction={standUp} />
            </ActionPanel>
          }
        />
      }
      {!searchText &&
        <List.Item
          icon={Icon.ChevronDown}
          title="Sit Down"
          actions={
            <ActionPanel>
              <Action title="Sit Down" onAction={sitDown} />
            </ActionPanel>
          }
        />
      }
      <List.Item
        icon={Icon.Pencil}
        title={`Set desk to ${ deskHeight }cm`}
        actions={
          <ActionPanel>
            <Action title="Set Position" onAction={() => {
              setDeskToPosition(deskHeight)
            }} />
          </ActionPanel>
        }
      />

      {!isInstalled && (
        <List.Item
          icon={Icon.Download}
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
