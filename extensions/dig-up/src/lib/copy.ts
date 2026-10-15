// What the views say, kept in one place: DigUp's own strings (SearchPanelView.swift, SearchWindow.swift,
// Onboarding.swift, SettingsWindow.swift, AddFolders.swift), with "DigUp" said as "Dig Up". Pure (test/results.test.ts).

import type { SetupState } from "../../engine/api";
import { GROUP_TITLES, type ResultGroupKind } from "./results";
import { MODEL_SIZE } from "./status-text";

/** The kind filter: everything, or one group (Code searches the code index). */
export type KindFilter = "all" | ResultGroupKind;

export const KIND_FILTERS: readonly KindFilter[] = [
  "all",
  "screenshots",
  "images",
  "documents",
  "video",
  "audio",
  "code",
];

export function filterTitle(kind: KindFilter): string {
  return kind === "all" ? "All" : GROUP_TITLES[kind];
}

export function isKindFilter(value: unknown): value is KindFilter {
  return typeof value === "string" && (KIND_FILTERS as readonly string[]).includes(value);
}

/** The search field's examples (DigUp: SearchPanelView.swift:34-38, SearchWindow.swift:485-490). */
export function placeholder(hasCode: boolean, kind: KindFilter = "all", window = false): string {
  if (kind === "code") return "Describe the code: “retry a request with backoff”, a name in it…";
  if (hasCode) return "Describe it: “zebra in a video”, “code: retry with backoff”…";
  return window
    ? "Describe it: “receipt from the hardware store”, “zebra in a video”…"
    : "Describe it: “payment error screenshot”, “zebra in a video”…";
}

export const NO_FOLDERS = { title: "No folders chosen yet", message: "Dig Up only searches the folders you pick." };
export const NO_FOLDERS_WINDOW = {
  title: "Choose folders to search",
  message: "Dig Up only looks where you tell it to.",
};

export function noMatches(isCode: boolean, window = false, query = ""): { title: string; message: string } {
  if (window) {
    return {
      title: `No good matches for “${query.trim()}”`,
      message: isCode
        ? "Try saying what the code does, or a name that's in it."
        : "Try describing what's in it: what you'd see or hear, or words you remember.",
    };
  }
  return isCode
    ? { title: "No good matches in your code", message: "Try saying what the code does, or a name that's in it." }
    : { title: "No good matches", message: "Try what you'd see or hear in it, or words you remember from it." };
}

export const CODE_OFF = {
  title: "Code search is off",
  message:
    "Dig Up can find code by what it does, in the folders you pick. Code gets an index of its own and never shows up " +
    "in other searches.",
};

export const CODE_HINT = { title: "Search your code", message: "Say what the code does, or type a name that's in it." };

export const CODE_EXAMPLES = [
  "code: retry a request with backoff",
  "code: where the settings are saved",
  "code: parse the command line options",
];

/** The search home's examples, each with the kind it finds (DigUp: SearchWindow.swift SearchHome). */
export function homeExamples(hasCode: boolean): Array<{ text: string; kind: ResultGroupKind }> {
  const examples: Array<{ text: string; kind: ResultGroupKind }> = [
    { text: "a screenshot of an error message", kind: "screenshots" },
    { text: "receipt", kind: "documents" },
    { text: "whiteboard notes", kind: "images" },
    { text: "someone laughing", kind: "audio" },
    { text: "a dog on the beach", kind: "video" },
    { text: "slides about the budget", kind: "documents" },
  ];
  return hasCode ? [...examples, { text: "code: where the settings are saved", kind: "code" }] : examples;
}

export const HOME_TITLE = "Describe it. Dig it up.";
export const HOME_MESSAGE =
  "Type what you remember in the search field above: what's in it, what it looks or sounds like, or words from it.";

export const HOTKEY_HINT =
  "To open Dig Up from any app, give the Dig Up command a hotkey in Raycast's settings → Extensions (DigUp uses ⇧⌘Space).";

/** DigUp lives in the menu bar; here that's a command Raycast runs only after it's been opened once (PARITY P-146). */
export const MENU_BAR_HINT =
  "Run **Dig Up Status** once to put Dig Up in the menu bar: it shows how indexing is going, and starts indexing " +
  "again after a restart.";

export const WEAKER_EXPLAINER = (expanded: boolean) =>
  `They match much less well than the results above. Press Return to ${expanded ? "fold them away." : "show them."}`;

export function weakerTitle(count: number, expanded: boolean): string {
  return expanded ? "Weaker matches" : `${count} weaker ${count === 1 ? "match" : "matches"}`;
}

/** "Show all 8 documents…" (DigUp lowercases the group's title: "Show all 7 video…"). */
export function showAllTitle(kind: ResultGroupKind, total: number): string {
  return `Show all ${total} ${GROUP_TITLES[kind].toLowerCase()}…`;
}

/** What the first-run download fetches, from the parts that are missing. */
export function setupSubtitle(setup: SetupState): string {
  if (setup.state !== "missing") return "";
  const model = setup.missing.some((part) => part !== "llama");
  const llama = setup.missing.includes("llama");
  if (model && llama) return `Downloads the model (${MODEL_SIZE}) and llama.cpp, once`;
  if (model) return `Downloads the model (${MODEL_SIZE}), once`;
  return "Downloads llama.cpp's server, once";
}

/** The welcome (DigUp: Onboarding.swift welcome step), as the setup item's detail. */
export function welcomeMarkdown(setup: SetupState): string {
  const lines = [
    "# Dig Up",
    `**${HOME_TITLE}**`,
    "- **Screenshots and photos**: “that payment error”, “the zebra”, “whiteboard from Tuesday”",
    "- **PDFs and documents**: “the clause about pets in the lease”, “flight receipt”",
    "- **Moments inside audio and video**: “where they talk about sleep”, “the part with the drums”",
    "- **Code**, by what it does: “code: retry with backoff”",
    `Everything is indexed and searched on this Mac. Dig Up downloads its AI model (EmbeddingGemma 2, ${MODEL_SIZE}) ` +
      "and llama.cpp's server once; after that it works offline, and nothing you index ever leaves your Mac.",
    "If DigUp is installed, or the model is in your Hugging Face cache, Dig Up uses that copy instead of downloading " +
      "it again. You can also point the **Model Folder** preference at the two files.",
    MENU_BAR_HINT,
  ];
  if (setup.state === "failed") lines.push(`**The download stopped:** ${setup.error}`);
  return lines.join("\n\n");
}

/** Settings → Folders footers and notes. */
export const TYPES_NOTE =
  "Dig Up only reads pictures, PDFs, documents (txt, md, rtf, docx, odt, html), audio and video here; code is read " +
  "only in the code folders. Keys and certificates are never read, nor are hidden folders like ~/.ssh.";

export const CODE_NOTE =
  "Code search reads source files, notebooks and a repo's own docs. It skips what git ignores, vendored and " +
  "generated code, data files, and anything that looks like a key or a password.";

export const CODE_INTRO =
  "Find code by what it does, or by a name in it: type code: in Dig Up, as in “code: retry with backoff”. Code has " +
  "an index of its own, and it never shows up in other searches.";

export const ADD_FOLDERS_INTRO =
  "Dig Up reads a new folder once, then keeps up with what changes in it. Pick as many folders as you like.";

export const ACCESS_NOTE =
  "macOS asks before Raycast, and so Dig Up, can read folders like Desktop, Documents and Downloads. Dig Up only " +
  "reads files: it never changes, moves or uploads them.";

export const FULL_DISK_ACCESS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

export const PRIVACY_NOTE =
  "Dig Up reads the folders you choose and keeps what it learns in its index, on this Mac. It goes online only to " +
  "download its model and llama.cpp, once, which sends nothing about your files.";

/** Name the part that will be installed, including when a cached model already exists. */
export function setupActionTitle(setup: SetupState): string {
  if (setup.state === "failed") return "Retry Setup";
  if (setup.state !== "missing") return "Set Up Dig Up";
  if (setup.missing.every((part) => part === "llama")) return "Download Search Engine";
  return setup.missing.includes("llama") ? "Download Model and Search Engine" : "Download Search Model";
}
