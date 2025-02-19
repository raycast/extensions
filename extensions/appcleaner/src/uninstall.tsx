import type { AppItem } from "./lib";

import { useEffect, useState } from "react";
import { List } from "@raycast/api";

import { ListItem } from "./list-item";
import { MissingDependency } from "./missing-dependency";
import { AppManager, checkDependencies, showError } from "./lib";

const $apps = new AppManager();

export default function Command() {
  const [dependencyError, setDependencyError] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkDependencies()
      .then(() => $apps.getApps())
      .catch(() => setDependencyError(true));

    $apps.emitter.on("update", onUpdate).on("error", onError);
  }, []);

  function onUpdate(_apps: AppItem[]) {
    setLoading(false);
    setApps(_apps);
  }

  function onError(error: Error) {
    setLoading(false);
    setApps([]);
    showError(error.message, "Fetching applications failed.");
  }

  if (dependencyError) return <MissingDependency />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Applications...">
      <List.Section title="Results" subtitle={apps?.length + ""}>
        {apps?.map((app) => <ListItem key={app.path} app={app} />)}
      </List.Section>
    </List>
  );
}
