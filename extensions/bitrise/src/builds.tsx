import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchApps } from "./api/apps";
import { fetchBuilds } from "./api/builds";
import { AppsByOwner, AppSlug, BuildsByStatus } from "./api/types";
import { BuildList } from "./components/BuildList";
import { handleError } from "./util/error";

interface State {
  apps?: AppsByOwner;
  builds?: BuildsByStatus;
  isLoading: boolean;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: false });

  const [selectedApp, setSelectedApp] = useState<AppSlug | "all">("all");

  useEffect(() => {
    async function fetch() {
      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        const builds = await fetchBuilds(selectedApp);
        setState((previous) => ({ ...previous, builds: builds, isLoading: false }));
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
        });
      }
    }

    fetch();
  }, [selectedApp]);

  useEffect(() => {
    async function fetch() {
      try {
        const apps = await fetchApps();
        setState((previous) => ({ ...previous, apps: apps }));
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
        });
      }
    }
    fetch();
  }, []);

  if (state.error) {
    handleError(state.error);
  }

  return (
    <BuildList
      builds={state.builds}
      isLoading={state.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select App"
          storeValue={true}
          placeholder={"Search apps"}
          onChange={(newValue) => setSelectedApp(newValue)}
        >
          <List.Dropdown.Item key={"all"} title={"All apps"} value={"all"} />

          {state.apps &&
            [...state.apps.apps.entries()].map((entry) => (
              <List.Dropdown.Section title={state.apps?.owners.get(entry[0])?.name} key={entry[0]}>
                {entry[1].map((app) => (
                  <List.Dropdown.Item
                    key={app.slug}
                    title={app.title}
                    value={app.slug}
                    icon={app.avatar_url ?? Icon.Box}
                  />
                ))}
              </List.Dropdown.Section>
            ))}
        </List.Dropdown>
      }
      displayRepoTitle={selectedApp == "all"}
    />
  );
}
