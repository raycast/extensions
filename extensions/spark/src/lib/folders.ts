// Which Spark icon a folder gets, and how a folder section is titled.
//
// No Raycast imports here: this file runs under `node --test` as-is.

import type { FolderSection } from "./types.ts";

const SYSTEM_ICONS: Record<string, string> = {
  inbox: "SystemFolderInbox",
  sent: "SystemFolderSend",
  drafts: "SystemFolderDraft",
  archive: "SystemFolderArchive",
  trash: "SystemFolderTrash",
  spam: "SystemFolderSpam",
  starred: "SystemFolderPin",
  later: "SystemFolderSnooze",
  blocked: "SystemFolderBlocked",
};

export interface FolderRow {
  name: string;
  identifier: string;
  count: number;
  /// Spark icon file name.
  icon: string;
  system: boolean;
}

/// A section's folders with their icons. Spark lists system folders first, so
/// only the first folder of a system name is the system one - a custom label
/// can share the name ("Later").
export function folderRows(section: FolderSection): FolderRow[] {
  const seen = new Set<string>();
  return section.folders.map((folder) => {
    const key = folder.name.toLowerCase();
    const system = key in SYSTEM_ICONS && !seen.has(key);
    seen.add(key);
    return {
      name: folder.name,
      identifier: folder.identifier,
      count: folder.message_count,
      icon: system ? SYSTEM_ICONS[key] : section.uses_gmail_labels ? "Label" : "Folder",
      system,
    };
  });
}

export function sectionTitle(section: FolderSection): string {
  return section.kind === "unified" ? "All Accounts" : (section.email ?? "");
}

export function sectionSubtitle(section: FolderSection): string | undefined {
  if (section.kind === "shared_inbox") return "Shared inbox";
  if (section.kind === "unified")
    return section.excludes_shared_inboxes ? "Unified, without shared inboxes" : "Unified";
  return undefined;
}

/// Stable id for the scope dropdown: "unified", or the section's address.
export function sectionId(section: FolderSection): string {
  return section.kind === "unified" ? "unified" : `${section.kind}:${section.email ?? ""}`;
}
