import { ActionPanel, Icon, List, popToRoot, Action } from "@raycast/api";
import { existsSync } from "fs";
import { execSync } from "child_process";

export default function SwitchCommand() {
  const versions = [
    "5.6",
    "7.0",
    "7.1",
    "7.2",
    "7.3",
    "7.4",
    "8.0",
    "8.1",
    "8.2",
    "8.3",
    "8.4",
    "9.0",
  ];

  const brewPath = existsSync("/opt/homebrew/bin/brew")
    ? "/opt/homebrew"
    : "/usr/local";

  function items() {
    return versions.reverse().filter(function (version) {
      return existsSync(`${brewPath}/opt/php@${version}`);
    });
  }

  let current: string | null = null;

  if (existsSync(`${brewPath}/bin/php-config`)) {
    current = String(execSync(`${brewPath}/bin/php-config --version`)).slice(
      0,
      3
    );
  }

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items().map((version) => (
        <List.Item
          key={"switch-" + version}
          icon="list-icon.png"
          title={"Switch to PHP " + version}
          subtitle={
            version != current
              ? "Switch to PHP " +
                version +
                " and get notified once the switch is done."
              : "Attempt to switch to PHP " +
                version +
                ", even though this is already linked."
          }
          accessoryTitle={version == current ? "Active" : ""}
          accessoryIcon={version == current ? Icon.Checkmark : ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={"Switch Now"}
                url={"phpmon://switch/php/" + version}
                icon="list-icon.png"
                onOpen={function () {
                  // Pop to the root so that when the user re-opens the panel, they see the correctly linked version
                  popToRoot({ clearSearchBar: false });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
