import { Keyboard } from "@raycast/api";

export const UpdateProblem = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "u" },
  Windows: { modifiers: ["ctrl", "shift"], key: "u" },
};

export const ConfigureHost = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "h" },
  Windows: { modifiers: ["ctrl", "shift"], key: "h" },
};

export const ConfigureTrigger = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "t" },
  Windows: { modifiers: ["ctrl", "shift"], key: "t" },
};

export const ShowLatestData = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "l" },
  Windows: { modifiers: ["ctrl", "shift"], key: "l" },
};

export const ShowProblems = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

export const ShowTriggers = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
};
