import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
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

  return uuid;
}

type DayOneHook = () => {
  installed: boolean | "pending";
  addEntry: (entry: Entry) => Promise<string | undefined>;
};

export const useDayOneIntegration: DayOneHook = () => {
  const [installed, setInstalled] = useCachedState("installed", true);

  useEffect(() => {
    async function check() {
      const state = await isDayOneInstalled();
      setInstalled(state);
    }

    check();
  }, []);

  return {
    installed,
    addEntry,
  };
};
