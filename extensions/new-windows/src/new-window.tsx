import { spawn } from "child_process";
import { useState, useEffect } from "react";
import { closeMainWindow, getApplications, Application, List, ActionPanel, Action, PopToRootType } from "@raycast/api";

export default function () {
  const [searchText, setSearchText] = useState("");
  const [listItems, setListItems] = useState<Application[] | []>([]);

  useEffect(() => {
    async function getData() {
      const applications = await findApplications(searchText);
      setListItems(applications);
    }
    getData();
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Application"
      searchBarPlaceholder="Application Name"
    >
      {listItems.map((i) => (
        <List.Item
          key={i.bundleId}
          title={i.name}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => openApp(i.path)} />
            </ActionPanel>
          }
          icon={{
            fileIcon: i.path,
            // source: `/Users/james/Pictures/wallpapers/whats-the-font-of-this-wallpaper-ignore-the-flair-didnt-v0-14e04ug5pm0a1.webp`
          }}
        />
      ))}
    </List>
  );
}

async function findApplications(name: string) {
  name = name.toLowerCase();
  const applications = await getApplications();
  return applications.filter((a) => a.name.toLowerCase().includes(name));
}

function openApp(path: string) {
  const cmd = spawn("open", ["-n", "-a", path]);
  cmd.on("close", async () => {
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  });
}
