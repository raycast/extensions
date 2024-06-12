import { Keyboard } from "@raycast/api";

const shortcuts = {
  COPY_TO_CLIPBOARD: { modifiers: ["cmd"], key: "." },
} as const satisfies Record<string, Keyboard.Shortcut>;

export { shortcuts };
