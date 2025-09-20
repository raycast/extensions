import type { AppItem } from "./lib";

import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { AppManager, Uninstaller, showError } from "./lib";
import { ListItem } from "./list-item";
import { MissingDependency } from "./missing-dependency";

const $apps = new AppManager();

export default function Command() {
  const [dependencyError, setDependencyError] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Uninstaller.checkDependencies()
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
