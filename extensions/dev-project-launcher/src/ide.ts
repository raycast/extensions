import { Keyboard, getPreferenceValues } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { useEffect, useState } from "react";

const CONFIG_PREFERENCE_KEY = "configFilePath";
const CONFIG_FILE: string = getPreferenceValues()[CONFIG_PREFERENCE_KEY].replace("~", homedir());

enum App {
  vscode = "/Applications/Visual Studio Code.app",
  intellij = "/Applications/IntelliJ IDEA.app",
  goland = "/Applications/GoLand.app",
  intellijce = "/Applications/IntelliJ IDEA CE.app",
}

const defaultIdes: IDE[] = [
  {
    displayName: "VSCode",
    appName: App.vscode,
    shortcut: {
      modifiers: ["opt"],
      key: "v",
    },
  },
  {
    displayName: "IntelliJ IDEA",
    appName: App.intellij,
    shortcut: {
      modifiers: ["opt"],
      key: "i",
    },
  },
  {
    displayName: "GoLand",
    appName: App.goland,
    shortcut: {
      modifiers: ["opt"],
      key: "g",
    },
  },
  {
    displayName: "IntelliJ IDEA CE",
    appName: App.intellijce,
    shortcut: {
      modifiers: ["opt", "shift"],
      key: "i",
    },
  },
];

export type IDE = {
  displayName: string;
  appName: App;
  shortcut: Keyboard.Shortcut;
};

export const useIdes = () => {
  const [ides, setIdes] = useState<IDE[]>([]);

  useEffect(() => {
    const retrieveIdes = async () => {
      try {
        const savedIdes = await readFile(CONFIG_FILE);
        setIdes(JSON.parse(savedIdes?.toString()));
      } catch (e) {
        setIdes(defaultIdes);
      }
    };
    retrieveIdes();
  }, []);
  return ides;
};

export const updateIdesConfig = async (newConfig: IDE[]) => {
  await writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, "\t"));
};
