import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { exec } from "./utils";

export const missingCLIError = `### Day One CLI Missing 🚨
[Download here](https://dayoneapp.com/guides/tips-and-tutorials/command-line-interface-cli/)`;

type Entry = {
  body: string;
  date: Date;
  journal?: string;
};

export async function isDayOneInstalled(): Promise<boolean> {
  try {
    const result = await exec("dayone2");
    const commandExists = !result.includes("command not found");

    return commandExists;
  } catch (error) {
    return false;
  }
}

async function addEntry(entry: Entry) {
  const date = entry.date.toISOString().split("T")[0];
  let command = `dayone2 new "${entry.body}" --date "${date}"`;

  if (entry.journal) {
    command = `${command} --journal ${entry.journal}`;
  }

  const result = await exec(command);
  const match = /uuid: (\w+)/.exec(result);
  const uuid = match?.[1];

  if (uuid === undefined) throw Error("Failed to parse entry id from Day One CLI");

  return uuid;
}

type DayOneHook = () => {
  installed: boolean | "pending";
  addEntry: (entry: Entry) => Promise<string>;
  loading: boolean;
};

export const useDayOneIntegration: DayOneHook = () => {
  const [installed, setInstalled] = useCachedState("installed", false);
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
