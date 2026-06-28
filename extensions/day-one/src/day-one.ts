import { useEffect, useState } from "react";
import { exec } from "./utils";

export const missingCLIError = `### Day One CLI Missing 🚨
[Download here](https://dayoneapp.com/guides/tips-and-tutorials/command-line-interface-cli/)`;

export const CLISyncError = `### Day One CLI is out of sync ⚠️
This is fixed by starting the desktop application once.`;

type Entry = {
  body: string;
  date: Date;
  journal?: string;
};

export async function isDayOneInstalled(): Promise<CLIState> {
  try {
    await exec("dayone2 --version");
    return "ready";
  } catch (error) {
    if (error instanceof Error && error.message.includes(`addPersistentStoreWithType`)) {
      return "out-of-sync";
    }

    return "missing";
  }
}

async function addEntry(entry: Entry) {
  const date = entry.date.toISOString().split(".")[0] + "Z";
  let command = `dayone2 new "${entry.body}" --isoDate "${date}"`;

  if (entry.journal) {
    command = `${command} --journal "${entry.journal}"`;
  }

  const { stdout } = await exec(command);
  const match = /uuid: (\w+)/.exec(stdout);
  const uuid = match?.[1];

  if (uuid === undefined) throw Error("Failed to parse entry id from Day One CLI");

  return uuid;
}

type DayOneHook = () => {
  installed: CLIState;
  addEntry: (entry: Entry) => Promise<string>;
  loading: boolean;
};

type CLIState = "ready" | "out-of-sync" | "missing";

export const useDayOneIntegration: DayOneHook = () => {
  const [installed, setInstalled] = useState<CLIState>("missing");
  const [loading, setIsLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const state = await isDayOneInstalled();
      setInstalled(state);
      setIsLoading(false);
    }

    check();
  }, []);

  return {
    installed,
    addEntry,
    loading,
  };
};
