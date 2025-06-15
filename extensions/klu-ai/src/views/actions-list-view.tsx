import useActions from "@/hooks/use-actions";
import { useSelectedApplication } from "@/hooks/use-application";
import useApplications from "@/hooks/use-applications";
import { PersistedApp } from "@kluai/core";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { intlFormatDistance } from "date-fns";
import ActionView from "./action/action-view";
import PromptFormView from "./action/action-prompt-form";

const ApplicationsDropdown = ({ applications }: { applications: PersistedApp[] }) => {
  const { setSelectedApp } = useSelectedApplication();
  return (
    <List.Dropdown
      tooltip="Select an application"
      onChange={(id) => {
        const app = applications.find((_) => _.guid === id);
        if (applications.length === 0) return;
        if (app === undefined || !app) return setSelectedApp(applications[0]);
        setSelectedApp(app);
      }}
      storeValue
    >
      {applications.map((app) => (
        <List.Dropdown.Item key={app.guid} value={app.guid} title={app.name} icon={Icon.Folder} />
      ))}
    </List.Dropdown>
  );
};

const ActionsListView = () => {
  const { data: apps, isLoading: isAppsLoading } = useApplications();

  const { data: actions, isLoading: isActionsLoading } = useActions();

  const { push } = useNavigation();

  const isLoading = isAppsLoading || isActionsLoading;

  return (
    <List
      searchBarPlaceholder="Search actions"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={apps && apps.length > 0 ? <ApplicationsDropdown applications={apps} /> : undefined}
    >
      {actions.length > 0 ? (
        actions.map((a) => (
          <List.Item
            key={a.guid}
            id={a.guid}
            title={a.name}
            subtitle={a.description}
            accessories={[
              {
                tag: {
                  value: a.status,
                  color: a.status === "ACTIVE" ? Color.Green : undefined,
                },
              },
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
              <ActionPanel title={a.name}>
                <Action
                  title="Open Action"
                  icon={{ source: Icon.ArrowRightCircle }}
                  onAction={() => push(<ActionView guid={a.guid} />)}
                />
                <Action
                  title="Send Prompt"
                  icon={{ source: Icon.TextInput }}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<PromptFormView guid={a.guid} variables={a.meta_data?.variables ?? []} />)}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.Tray} title="No action is found" />
      )}
    </List>
  );
};

export default ActionsListView;
