import { Keyboard } from "@raycast/api";

// One scheme for the whole extension; the same letter means the same thing everywhere:
//   ⌘⌥ + letter  go to / view inside Raycast
//   ⌥⇧ + letter  open the matching dbt Cloud page
//   ⌘⇧ + letter  copy (Raycast's common Copy / Copy Name / Copy Path where they fit)
// ⌃ + letter is avoided because Raycast uses it to move through lists.

const nav = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({ modifiers: ["cmd", "opt"], key });
const web = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({ modifiers: ["opt", "shift"], key });
const copy = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({ modifiers: ["cmd", "shift"], key });

export const Shortcuts = {
  // Inside Raycast
  project: nav("p"),
  environment: nav("e"),
  job: nav("j"),
  runs: nav("r"),
  models: nav("m"),
  sources: nav("s"),
  lineage: nav("l"),
  details: nav("d"),
  performance: nav("g"),

  // dbt Cloud pages
  open: Keyboard.Shortcut.Common.Open,
  webProject: web("p"),
  webEnvironment: web("e"),
  webJob: web("j"),
  webRun: web("r"),
  webLineage: web("l"),
  webDocs: web("d"),
  webSettings: web("s"),

  // Copy
  copyId: Keyboard.Shortcut.Common.Copy,
  copyName: Keyboard.Shortcut.Common.CopyName,
  copyPath: Keyboard.Shortcut.Common.CopyPath,
  copySchema: copy("s"),
  copySourceCode: copy("s"),
  copySuccessRate: copy("s"),
  copyRef: copy("r"),
  copySteps: copy("x"),
  copySha: copy("g"),
  copyAverage: copy("a"),
  copyError: copy("e"),

  // Job actions
  trigger: copy("t"),
  cancel: { modifiers: ["cmd", "opt"], key: "x" } as Keyboard.Shortcut,
};
