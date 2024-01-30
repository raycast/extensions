import { PersistedApp } from "@kluai/core";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { intlFormatDistance } from "date-fns";
import { useState } from "react";
import useActions from "./hooks/use-actions";
import useApplications from "./hooks/use-applications";

const ApplicationsDropdown = ({
  applications,
  onChange,
}: {
  applications: PersistedApp[];
  onChange: (value: PersistedApp) => void;
}) => {
  return (
    <List.Dropdown
      tooltip="Select an application"
      onChange={(id) => {
        const app = applications.find((_) => _.guid === id);
        if (applications.length === 0) return;
        if (app === undefined || !app) return onChange(applications[0]);
        onChange(app);
      }}
    >
      {applications.map((app) => (
        <List.Dropdown.Item key={app.guid} value={app.guid} title={app.name} icon={Icon.AppWindowGrid2x2} />
      ))}
    </List.Dropdown>
  );
};

const SearchActionsView = () => {
  const [selectedApp, setSelectedApp] = useState<PersistedApp | undefined>(undefined);
  // TODO: Save selected app in cache
  const {
    data: { apps },
    isLoading: isAppsLoading,
  } = useApplications();

  const { data: actions, isLoading: isActionsLoading } = useActions(selectedApp ? selectedApp.guid : apps[0].guid);

  const isLoading = isAppsLoading || isActionsLoading;

  return (
    <List
      searchBarPlaceholder="Search actions"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={<ApplicationsDropdown applications={apps} onChange={setSelectedApp} />}
    >
      {actions.map((a) => (
        <List.Item
          key={a.guid}
          id={a.guid}
          title={a.name}
          subtitle={a.description}
          accessories={[
            {
              icon: Icon.Gear,
              text: a.modelName,
              tooltip: "Model",
            },
            {
              icon: Icon.Clock,
              text: intlFormatDistance(new Date(a.updatedAt), new Date()),
              tooltip: "Last updated",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Open" icon={{ source: Icon.Globe }} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default SearchActionsView;
