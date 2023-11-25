import { List, Icon } from "@raycast/api";
import { useState } from "react";
import { fetchApps } from "./api/apps";
import { fetchBuilds } from "./api/builds";
import { AppSlug } from "./api/types";
import { BuildList } from "./components/BuildList";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [selectedApp, setSelectedApp] = useState<AppSlug | "all">("all");

  const buildsState = useCachedPromise(async (app) => await fetchBuilds(app), [selectedApp]);

  const appsState = useCachedPromise(async () => await fetchApps(), [], {
    initialData: [],
  });

  return (
    <BuildList
      builds={buildsState.data}
      isLoading={buildsState.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select App"
          storeValue={true}
          placeholder={"Search apps"}
          onChange={(newValue) => setSelectedApp(newValue)}
        >
          <List.Dropdown.Item key={"all"} title={"All apps"} value={"all"} />

          {appsState.data.map((appsByOwner) => (
            <List.Dropdown.Section title={appsByOwner.owner.name} key={appsByOwner.owner.slug}>
              {appsByOwner.apps.map((app) => (
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
