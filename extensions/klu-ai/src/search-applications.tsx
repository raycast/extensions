import { PersistedApp } from "@kluai/core";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import klu from "./libs/klu";

const SearchApplications = () => {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const data = await klu.workspaces.getCurrent();
      const remoteApps = await klu.workspaces.getApps(data.projectGuid);

      interface App extends PersistedApp {
        actionsCount: number;
      }

      const apps = remoteApps.map(async (_) => {
        const app: App = {
          ..._,
          actionsCount: 0,
        };

        const actions = await klu.apps.getActions(_.guid);
        app.actionsCount = actions.length;

        return app;
      });

      const sortedApps = await Promise.all(apps);

      return sortedApps
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
  return (
    <List searchBarPlaceholder="Search applications" isLoading={isLoading} navigationTitle="Results">
      {data.map((a) => (
        <List.Item
          key={a.guid}
          id={a.guid}
          title={a.name}
          subtitle={a.description}
          accessories={[
            {
              icon: Icon.AppWindowGrid2x2,
              text: `${a.actionsCount.toString()} actions`,
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
