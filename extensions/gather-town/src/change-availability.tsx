import { useEffect, useState } from "react";
import { closeMainWindow, open, showToast, Toast, Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { gatherInstalled } from "./utils";

type Status = { label: string; keyCode: string; icon: { source: string; tintColor: string } };

const items: Status[] = [
  { label: "Available", keyCode: "31", icon: { source: Icon.Circle, tintColor: Color.Green } },
  { label: "In Focus", keyCode: "34", icon: { source: Icon.Headphones, tintColor: Color.Yellow } },
  { label: "Do Not Disturb", keyCode: "32", icon: { source: Icon.BellDisabled, tintColor: Color.Red } },
];

export default () => {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.label.includes(searchText)));
  }, [searchText]);

  const changeStatus = async (item: Status) => {
    const installed = await gatherInstalled();

    if (!installed) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Gather is not installed.",
        message: "Install it from: https://www.gather.town",
        primaryAction: {
          title: "Go to https://www.gather.town",
          onAction: (toast) => {
            open("https://www.gather.town");
            toast.hide();
          },
        },
      };

      await showToast(options);
    } else {
      await closeMainWindow();
      await runAppleScript('activate application "Gather"');
      // Toggle availability status
      await runAppleScript(`tell application "System Events" to key code ${item.keyCode} using command down`);
    }
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Change Availability"
      searchBarPlaceholder="Search availability statuses"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.label}
          icon={item.icon}
          title={item.label}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => changeStatus(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
