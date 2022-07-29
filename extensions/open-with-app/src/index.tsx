import {
  List,
  ActionPanel,
  ActionPanelItem,
  Application,
  getApplications,
  closeMainWindow,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "run-applescript";
import { execSync } from "child_process";

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      setApplications(await getApplications());
    }

    fetchApplications();
  }, []);

  return (
    <List isLoading={applications.length === 0} searchBarPlaceholder="Filter applications by name...">
      {applications.map((application) => (
        <ApplicationsListItem key={application.bundleId} application={application} />
      ))}
    </List>
  );
}

async function getFinderSelection(): Promise<string[]> {
  // The applescript below returns a string with a list of the items
  // selected in Finder separated by return characters
  const applescript = `
  tell application "Finder"
    set theItems to selection
  end tell

  set itemsPaths to ""

  repeat with itemRef in theItems
    set theItem to POSIX path of (itemRef as string)
    set itemsPaths to itemsPaths & theItem & return
  end repeat

  return itemsPaths
  `;

  const response = await runAppleScript(applescript);

  return response === "" ? [] : response.split("\r");
}

function ApplicationsListItem(props: { application: Application }) {
  const application = props.application;

  return (
    <List.Item
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      actions={
        <ActionPanel>
          <ActionPanelItem
            title={`Open with ${application.name}`}
            onAction={async () => {
              const selectedItems = await getFinderSelection();
              if (selectedItems.length === 0) {
                await showHUD(`⚠️  No Finder selection to open.`);
              } else {
                selectedItems.forEach((item) => {
                  execSync(`open -b ${application.bundleId} "${item.replace(/"/g, '\\"')}"`);
                });
              }
              closeMainWindow();
              popToRoot({ clearSearchBar: true });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
