import {
  List,
  ActionPanel,
  Application,
  getApplications,
  closeMainWindow,
  popToRoot,
  showHUD,
  getSelectedFinderItems,
  Action,
} from "@raycast/api";

import { useState, useEffect } from "react";
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

function ApplicationsListItem(props: { application: Application }) {
  const application = props.application;

  return (
    <List.Item
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      actions={
        <ActionPanel>
          <Action
            title={`Open with ${application.name}`}
            onAction={async () => {
              try {
                const selectedItems = await getSelectedFinderItems();
                if (selectedItems.length != 0) {
                  selectedItems.forEach((item) => {
                    execSync(`open -b ${application.bundleId} "${item.path.replace(/"/g, '\\"')}"`);
                  });
                } else {
                  await showHUD("⚠️  No Finder selection to open.");
                }
              } catch (error) {
                await showHUD("⚠️  No Finder selection to open.");
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
