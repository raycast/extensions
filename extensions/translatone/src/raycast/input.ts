import { Clipboard, getSelectedText } from "@raycast/api";
import { resolveInitialInput, type InitialInput } from "../core/input";

export function readInitialInput(): Promise<InitialInput> {
  return resolveInitialInput({
    readSelection: getSelectedText,
    readClipboard: () => Clipboard.readText(),
  });
}
