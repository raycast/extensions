import { PersistedApp } from "@kluai/core";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { intlFormatDistance } from "date-fns";
import ActionView from "./action/action-view";
import useActions from "@/hooks/use-actions";

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

const ActionsView = () => {
  const {
    data: { apps, actions },
    isLoading,
    onChangeApp: setSelectedApp,
  } = useActions();

  const { push } = useNavigation();

  return (
    <List
      searchBarPlaceholder="Search actions"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={
        apps.length > 0 ? <ApplicationsDropdown applications={apps} onChange={setSelectedApp} /> : undefined
      }
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
              text: a.modelName
                ? a.modelName.length > 20
                  ? `${a.modelName?.slice(0, 20)}...`
                  : a.modelName
                : "No model",
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
              <Action
                title="Open"
                icon={{ source: Icon.Globe }}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => push(<ActionView guid={a.guid} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default ActionsView;
