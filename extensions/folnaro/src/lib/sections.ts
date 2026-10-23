import type { StringKey } from "./text";

/**
 * The sections of Folnaro's main window in sidebar order (mac/Folnaro/App/SidebarItem.swift) with
 * the "Go" menu shortcut that opens each one (mac/Folnaro/Support/Commands/CommandRegistry.swift):
 * ⌘1 to ⌘9 for the first nine, ⌥⌘1 to ⌥⌘4 for the rest. Folnaro has no URL for a section, so
 * "Open Section" brings Folnaro to the front and presses that shortcut.
 */
export type SectionId =
  | "overview"
  | "invoices"
  | "quotes"
  | "recurring"
  | "income"
  | "time"
  | "projects"
  | "expenses"
  | "bank"
  | "customers"
  | "articles"
  | "reports"
  | "taxAdvisor";

export interface Section {
  id: SectionId;
  key: string;
  option: boolean;
  /** Raycast icon name (`Icon.<name>`), the closest match to the SF Symbol in the sidebar. */
  icon: string;
}

export interface SectionGroup {
  title?: StringKey;
  sections: Section[];
}

export const SECTION_GROUPS: SectionGroup[] = [
  { sections: [{ id: "overview", key: "1", option: false, icon: "House" }] },
  {
    title: "section.group.sales",
    sections: [
      { id: "invoices", key: "2", option: false, icon: "Receipt" },
      { id: "quotes", key: "3", option: false, icon: "Document" },
      { id: "recurring", key: "4", option: false, icon: "Repeat" },
      { id: "income", key: "5", option: false, icon: "BankNote" },
    ],
  },
  {
    title: "section.group.time",
    sections: [
      { id: "time", key: "6", option: false, icon: "Stopwatch" },
      { id: "projects", key: "7", option: false, icon: "Folder" },
    ],
  },
  {
    title: "section.group.spending",
    sections: [
      { id: "expenses", key: "8", option: false, icon: "Cart" },
      { id: "bank", key: "9", option: false, icon: "Building" },
    ],
  },
  {
    title: "section.group.records",
    sections: [
      { id: "customers", key: "1", option: true, icon: "TwoPeople" },
      { id: "articles", key: "2", option: true, icon: "Tag" },
    ],
  },
  {
    title: "section.group.taxes",
    sections: [
      { id: "reports", key: "3", option: true, icon: "BarChart" },
      { id: "taxAdvisor", key: "4", option: true, icon: "Briefcase" },
    ],
  },
];

export const ALL_SECTIONS: Section[] = SECTION_GROUPS.flatMap((group) => group.sections);

/** AppleScript that presses a section's shortcut in Folnaro once it is frontmost. */
export function sectionScript(section: Section, processName = "Folnaro"): string {
  const modifiers = section.option ? "{command down, option down}" : "{command down}";
  return [
    'tell application id "app.folnaro.mac" to activate',
    'tell application "System Events"',
    `  repeat 40 times`,
    `    if exists (process "${processName}") then`,
    `      if frontmost of process "${processName}" then exit repeat`,
    `    end if`,
    `    delay 0.05`,
    `  end repeat`,
    `  keystroke "${section.key}" using ${modifiers}`,
    "end tell",
  ].join("\n");
}
