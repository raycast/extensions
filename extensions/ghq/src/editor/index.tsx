import { runAppleScript } from "@raycast/utils";

export function lanuchEditor(editor: string, path: string) {
  const script = `tell application "${editor}" to open "${path}"`;
  return runAppleScript(script);
}
