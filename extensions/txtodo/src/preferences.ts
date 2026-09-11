import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";

function expandHome(p: string): string {
  if (p.startsWith("~/")) return p.replace(/^~/, homedir());
  if (p === "~") return homedir();
  return p;
}

export function getPreferences(): Preferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    todoPath: expandHome(raw.todoPath || "~/todo.txt"),
    donePath: expandHome(raw.donePath || "~/done.txt"),
    archiveOnComplete: Boolean(raw.archiveOnComplete),
    autoStampCreationDate: Boolean(raw.autoStampCreationDate),
  };
}
