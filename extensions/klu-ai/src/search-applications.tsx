import { PersistedAction, PersistedApp } from "@kluai/core";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import klu from "./libs/klu";
import { intlFormatDistance } from "date-fns";

const useApplications = () => {
  const hook = useCachedPromise(
    async () => {
      const data = await klu.workspaces.getCurrent();
      const remoteApps = await klu.workspaces.getApps(data.projectGuid);

      return remoteApps
        .sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return hook;
};

const useActions = (actionGuid: string) => {
  const hook = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.apps.getActions(actionGuid);

      interface Action extends PersistedAction {
        modelName: string | undefined;
      }

      const actions = data.map(async (_) => {
        const action: Action = {
          ..._,
          modelName: undefined,
        };

        const { modelId } = await klu.actions.get(_.guid);
        const { llm } = await klu.models.get(modelId);

        action.modelName = llm;

        return action;
      });

      const newActions = await Promise.all(actions);

      return newActions;
    },
    [actionGuid],
    {
      execute: actionGuid !== undefined,
      keepPreviousData: true,
      initialData: [],
    },
  );

  return hook;
};

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

const SearchApplications = () => {
  const [selectedApp, setSelectedApp] = useState<PersistedApp | undefined>(undefined);
  // TODO: Save selected app in cache
  const { data, isLoading } = useApplications();

  const { data: actions, isLoading: isActionsLoading } = useActions(selectedApp?.guid ?? data[0].guid);

  return (
    <List
      searchBarPlaceholder="Search actions"
      isLoading={isLoading || isActionsLoading}
      navigationTitle="Results"
      searchBarAccessory={<ApplicationsDropdown applications={data} onChange={setSelectedApp} />}
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

export default SearchApplications;
