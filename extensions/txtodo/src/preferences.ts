import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";

type RawPreferences = {
  todoPath: string;
  donePath: string;
  archiveOnComplete: boolean;
  autoStampCreationDate: boolean;
};

export type Preferences = {
  todoPath: string;
  donePath: string;
  archiveOnComplete: boolean;
  autoStampCreationDate: boolean;
};

function expandHome(p: string): string {
  if (p.startsWith("~/")) return p.replace(/^~/, homedir());
  if (p === "~") return homedir();
  return p;
}

export function getPreferences(): Preferences {
  const raw = getPreferenceValues<RawPreferences>();
  return {
    todoPath: expandHome(raw.todoPath || "~/todo.txt"),
    donePath: expandHome(raw.donePath || "~/done.txt"),
    archiveOnComplete: Boolean(raw.archiveOnComplete),
    autoStampCreationDate: Boolean(raw.autoStampCreationDate),
  };
}
