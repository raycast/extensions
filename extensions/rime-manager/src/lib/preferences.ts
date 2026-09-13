import { homedir } from "node:os";
import { join } from "node:path";

import { getPreferenceValues } from "@raycast/api";

import type { Preferences } from "../types";

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

export function getPreferences(): Preferences {
  const values = getPreferenceValues<Preferences>();
  return {
    ...values,
    reloadAfterChanges: values.reloadAfterChanges ?? true,
    rimeUserDirectory: values.rimeUserDirectory ? expandHome(values.rimeUserDirectory) : undefined,
    backupDirectory: values.backupDirectory ? expandHome(values.backupDirectory) : undefined,
  };
}
