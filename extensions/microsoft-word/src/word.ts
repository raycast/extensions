import { runAppleScript } from "@raycast/utils";
import { createWordClient } from "./word-client";

export type { WordDocument } from "./word-client";
export const { readActiveDocument, readText, toggleTrackChanges, createDocument, setTrackChanges } = createWordClient(
  (script, args, options) => runAppleScript(script, args, options),
);
