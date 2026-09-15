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

// Day One renamed its CLI from `dayone2` to `dayone` starting with Mac 2025.19.
// Newer installs only ship `dayone`, older ones only ship `dayone2`, so we probe both.
const CLI_CANDIDATES = ["dayone", "dayone2"] as const;

let resolvedCommand: string | null = null;

async function resolveCLI(): Promise<{ command: string | null; state: CLIState }> {
  let outOfSyncCommand: string | null = null;

  for (const candidate of CLI_CANDIDATES) {
    try {
      await exec(`${candidate} --version`);
      resolvedCommand = candidate;
      return { command: candidate, state: "ready" };
    } catch (error) {
      if (error instanceof Error && error.message.includes(`addPersistentStoreWithType`)) {
        // The CLI exists but is out of sync with the desktop app.
        outOfSyncCommand = outOfSyncCommand ?? candidate;
      }
    }
  }

  if (outOfSyncCommand) {
    resolvedCommand = outOfSyncCommand;
    return { command: outOfSyncCommand, state: "out-of-sync" };
  }

  resolvedCommand = null;
  return { command: null, state: "missing" };
}

export async function isDayOneInstalled(): Promise<CLIState> {
  const { state } = await resolveCLI();
  return state;
}

async function addEntry(entry: Entry) {
  const cli = resolvedCommand ?? (await resolveCLI()).command;

  if (!cli) throw Error("Day One CLI not found");

  const date = entry.date.toISOString().split(".")[0] + "Z";
  let command = `${cli} new "${entry.body}" --isoDate "${date}"`;

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
