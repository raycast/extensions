import { Keyboard } from "@raycast/api";

export const ShowContent: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "a" },
  Windows: { modifiers: ["ctrl", "shift"], key: "a" },
};

export const AddToPlaylist: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "a" },
  Windows: { modifiers: ["ctrl"], key: "a" },
};

export const Like: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "l" },
  Windows: { modifiers: ["ctrl"], key: "l" },
};

export const Dislike: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

export const StartRadio: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
};

export const ConnectDevice: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "k" },
  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
};

export const OpenSearch: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "f" },
  Windows: { modifiers: ["ctrl", "shift"], key: "f" },
};

export const OpenLibrary: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "l" },
  Windows: { modifiers: ["ctrl", "shift"], key: "l" },
};
