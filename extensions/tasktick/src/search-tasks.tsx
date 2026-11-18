import React from "react";
import { List, environment, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { resolveCliPath } from "./lib/cli-detection";
import { TasksList } from "./views/tasks-list";
import { CliNotFound } from "./views/cli-not-found";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.SearchTasks>();

  const { data: cliPath, isLoading } = useCachedPromise(
    (preferred: string | undefined, isDev: boolean) =>
      resolveCliPath(preferred, isDev),
    [prefs.cliPath, environment.isDevelopment],
  );

  if (cliPath === null) return <CliNotFound />;

  if (cliPath) {
    return <TasksList cliPath={cliPath} prefs={prefs} />;
  }

  return <List isLoading={isLoading} searchBarPlaceholder="Search tasks…" />;
}
