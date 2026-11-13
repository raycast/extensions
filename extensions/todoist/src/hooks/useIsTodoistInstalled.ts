import { getApplications } from "@raycast/api";
import { useEffect, useState } from "react";

export async function isTodoistInstalled() {
  const applications = await getApplications();
  const isInstalled = applications.some((app) => app.bundleId === "com.todoist.mac.Todoist");

  return isInstalled;
}

// Checked once per command run: the hook is used in every action panel, which Raycast mounts again on each
// selection change, and listing all applications each time adds up while scrolling.
let installed: boolean | undefined;
let installedCheck: Promise<boolean> | undefined;

export function useIsTodoistInstalled() {
  const [value, setValue] = useState(installed ?? false);

  useEffect(() => {
    if (installed !== undefined) return;

    installedCheck ??= isTodoistInstalled().then((result) => (installed = result));
    installedCheck.then(setValue);
  }, []);

  return value;
}
