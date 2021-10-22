import {
  List,
  ActionPanel,
  ActionPanelItem,
  Application,
  getApplications,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "run-applescript";

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      setApplications(await getApplications());
    }

    fetchApplications();
  }, []);

  return (
    <List
      isLoading={applications.length === 0}
      searchBarPlaceholder="Filter applications by name...">
      {applications.map((app) => (
        <ApplicationsListItem key={app.bundleId} application={app} />
      ))}
    </List>
  );
}


function ApplicationsListItem(props: { application: Application }) {
  const app = props.application;

  const applescript = `
  on run
    tell application "Finder"
      set theItems to selection
    end tell

    repeat with itemRef in theItems
      set theItem to POSIX path of (itemRef as string)
      set command to "open -b ${app.bundleId} " & quoted form of theItem
      do shell script command
    end repeat
  end run
  `;

  return (
    <List.Item
      key={app.bundleId}
      title={app.name}
      icon={{ fileIcon: app.path }}
      actions={
        <ActionPanel>
          <ActionPanelItem
            title={`Open with ${app.name}`}
            onAction={() => {
              closeMainWindow();
              runAppleScript(applescript);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
