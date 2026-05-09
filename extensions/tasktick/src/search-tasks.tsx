// src/search-tasks.tsx
import React, { useEffect, useState } from "react";
import { Detail, environment, getPreferenceValues } from "@raycast/api";
import { resolveCliPath } from "./lib/cli-detection";
import { TasksList } from "./views/tasks-list";
import { CliNotFound } from "./views/cli-not-found";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.SearchTasks>();
  const [cliPath, setCliPath] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // In `ray develop` mode, prefer the dev binary so we don't talk to
    // the installed prod TaskTick.app (whose CLI may be older than what
    // this extension expects, and would also pollute the Dock until the
    // Dock-icon fix ships in a stable release).
    resolveCliPath(prefs.cliPath, environment.isDevelopment).then(setCliPath);
  }, [prefs.cliPath]);

  if (cliPath === undefined) return <Detail isLoading markdown="" />;
  if (cliPath === null) return <CliNotFound />;
  return <TasksList cliPath={cliPath} prefs={prefs} />;
}
