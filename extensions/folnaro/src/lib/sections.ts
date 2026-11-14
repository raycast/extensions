import type { StringKey } from "./text";

/**
 * The sections of Folnaro's main window in sidebar order and groups (mac/Folnaro/App/SidebarItem.swift:
 * Today, Money, Work, Taxes). The ids are the sidebar raw values, which are also the names in
 * `FolnaroLink.sections`: "Open Section" opens `folnaro://section/<id>`, the link Folnaro itself
 * accepts (mac/Packages/FolnaroKit/Sources/FolnaroCore/Links/FolnaroLink.swift), so no shortcut
 * is pressed and no Accessibility access is needed.
 */
export type SectionId =
  | "overview"
  | "suggestions"
  | "time"
  | "invoices"
  | "recurring"
  | "income"
  | "quotes"
  | "expenses"
  | "bank"
  | "projects"
  | "customers"
  | "contracts"
  | "articles"
  | "reports"
  | "taxAdvisor";

export interface Section {
  id: SectionId;
  /** Raycast icon name (`Icon.<name>`), the closest match to the SF Symbol in the sidebar. */
  icon: string;
}

export interface SectionGroup {
  title: StringKey;
  sections: Section[];
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    title: "section.group.today",
    sections: [
      { id: "overview", icon: "House" },
      { id: "suggestions", icon: "Tray" },
      { id: "time", icon: "Stopwatch" },
    ],
  },
  {
    title: "section.group.money",
    sections: [
      { id: "invoices", icon: "Receipt" },
      { id: "recurring", icon: "Repeat" },
      { id: "income", icon: "BankNote" },
      { id: "quotes", icon: "Document" },
      { id: "expenses", icon: "Cart" },
      { id: "bank", icon: "Building" },
    ],
  },
  {
    title: "section.group.work",
    sections: [
      { id: "projects", icon: "Folder" },
      { id: "customers", icon: "TwoPeople" },
      { id: "contracts", icon: "Pencil" },
      { id: "articles", icon: "Tag" },
    ],
  },
  {
    title: "section.group.taxes",
    sections: [
      { id: "reports", icon: "BarChart" },
      { id: "taxAdvisor", icon: "Person" },
    ],
  },
];

export const ALL_SECTIONS: Section[] = SECTION_GROUPS.flatMap((group) => group.sections);

/** The link that shows a section of Folnaro's main window. */
export function sectionUrl(section: Pick<Section, "id">): string {
  return `folnaro://section/${section.id}`;
}
