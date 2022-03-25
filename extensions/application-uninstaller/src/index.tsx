import {
  List,
  ActionPanel,
  ActionPanelItem,
  Application,
  getApplications,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execaCommand } from "execa";
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
          <ActionPanelItem
            title={`Uninstall ${application.name}`}
            onAction={async () => {
              execSync(`open -a /Applications/AppCleaner.app "${application.path}"`);
              closeMainWindow();
              popToRoot({ clearSearchBar: true });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
