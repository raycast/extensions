import { ActionPanel, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { existsSync } from "fs";

export default function CommonActionsCommand() {
  const items = [
    {
      id: "list",
      title: "Show Linked & Parked Domains",
      subtitle: "Opens the window displaying the list of domains registered with Valet.",
      accessoryTitle: null,
      url: "phpmon://list",
    },
    {
      id: "locate/config",
      title: "Locate PHP Configuration File (php.ini)",
      subtitle: "Locates the PHP Configuration File in Finder.",
      accessoryTitle: null,
      url: "phpmon://locate/config",
    },
    {
      id: "locate/composer",
      title: "Locate Global Composer File (.composer)",
      subtitle: "Locates the Global Composer file in Finder.",
      accessoryTitle: null,
      url: "phpmon://locate/composer",
    },
    {
      id: "locate/valet",
      title: "Locate Valet Folder (.config/valet)",
      subtitle: "Locates the Valet folder in Finder.",
      accessoryTitle: null,
      url: "phpmon://locate/valet",
    },
    {
      id: "phpinfo",
      title: "Show Current Configuration (phpinfo)",
      subtitle: "Opens a temporary file with the output of `phpinfo()`.",
      accessoryTitle: null,
      url: "phpmon://phpinfo",
    },
    {
      id: "services/restart/all",
      title: "Restart All Services",
      subtitle: "Attempts to restart all Valet services (php, nginx and dnsmasq).",
      accessoryTitle: null,
      url: "phpmon://services/restart/all",
    },
    {
      id: "services/restart/ngninx",
      title: "Restart Service: nginx",
      subtitle: "Attempts to restart the following service: nginx.",
      accessoryTitle: null,
      url: "phpmon://services/restart/nginx",
    },
    {
      id: "services/restart/dnsmasq",
      title: "Restart Service: dnsmasq",
      subtitle: "Attempts to restart the following service: dnsmasq.",
      accessoryTitle: null,
      url: "phpmon://services/restart/dnsmasq",
    },
    {
      id: "services/restart/php",
      title: "Restart Service: php",
      subtitle: "Attempts to restart the service that corresponds to the linked PHP version.",
      accessoryTitle: null,
      url: "phpmon://services/restart/php",
    },
    {
      id: "services/stop",
      title: "Stop All Services",
      subtitle: "Attempts to stop all Valet services (php, nginx and dnsmasq).",
      accessoryTitle: null,
      url: "phpmon://services/stop",
    },
  ];

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      <List.Item
        key="switch"
        icon="list-icon.png"
        title="Switch to PHP Version..."
        subtitle="Choose a new version of PHP to switch to."
        actions={
          <ActionPanel>
            <PushAction title="Continue to Select a Version" target={<SwitchForm />} />
          </ActionPanel>
        }
      />
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <OpenInBrowserAction title="Execute with PHP Monitor" url={item.url} icon="list-icon.png" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SwitchForm() {
  function items() {
    const brewPath = existsSync("/opt/homebrew/bin/brew") ? "/opt/homebrew" : "/user/local";

    return versions.reverse().filter(function (version) {
      return existsSync(brewPath + "/opt/php@" + version);
    });
  }

  const versions = ["5.6", "7.0", "7.1", "7.2", "7.3", "7.4", "8.0", "8.1", "8.2", "8.3", "8.4", "9.0"];

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items().map((version) => (
        <List.Item
          key={"switch-" + version}
          icon="list-icon.png"
          title={"Switch to PHP " + version}
          subtitle={"Switch to PHP " + version + " and get notified once the switch is done."}
          actions={
            <ActionPanel>
              <OpenInBrowserAction title={"Switch Now"} url={"phpmon://switch/php/" + version} icon="list-icon.png" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
