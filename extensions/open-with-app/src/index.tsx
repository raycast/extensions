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
  open,
  PopToRootType,
} from "@raycast/api";
import { useState, useEffect } from "react";

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
                await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
                if (selectedItems.length != 0) {
                  for (let i = 0; i < selectedItems.length; i++) {
                    await open(selectedItems[i].path, application.bundleId);
                  }
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
