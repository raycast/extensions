import { getAllShortcuts, getNodeById, listBookmarks } from "./cache";

export type DestinationSection = "System" | "Workflowy Shortcuts" | "My Bookmarks" | "Configured Default";

export interface DestinationOption {
  value: string;
  title: string;
  target: string;
  targetNodeId?: string | null;
  section: DestinationSection;
}

export function listCaptureDestinationOptions(): DestinationOption[] {
  const systemNames = ["inbox", "today"];
  const shortcuts = getAllShortcuts();
  const bookmarks = listBookmarks();

  const options: DestinationOption[] = systemNames.map((name) => ({
    value: `system:${name}`,
    title: name === "inbox" ? "Inbox" : "Today",
    target: name,
    section: "System",
  }));

  for (const shortcut of shortcuts) {
    if (systemNames.includes(shortcut.name)) continue;
    options.push({
      value: `shortcut:${shortcut.name}`,
      title: shortcut.label,
      target: shortcut.name,
      targetNodeId: shortcut.nodeId,
      section: "Workflowy Shortcuts",
    });
  }

  for (const bookmark of bookmarks) {
    options.push({
      value: `bookmark:${bookmark.name}`,
      title: bookmark.name,
      target: bookmark.nodeId,
      targetNodeId: bookmark.nodeId,
      section: "My Bookmarks",
    });
  }

  return options;
}

export function resolveDefaultCaptureDestination(preferredTarget: string | undefined): DestinationOption {
  const options = listCaptureDestinationOptions();
  const preferred = preferredTarget?.trim().toLowerCase();

  const inbox =
    options.find((option) => option.target === "inbox") ??
    ({ value: "system:inbox", title: "Inbox", target: "inbox", section: "System" } satisfies DestinationOption);

  if (!preferred) return inbox;

  const exactMatch = options.find((option) => {
    return (
      option.target.toLowerCase() === preferred ||
      option.title.toLowerCase() === preferred ||
      option.value.toLowerCase() === preferred
    );
  });

  if (exactMatch) return exactMatch;

  const bookmarkMatch = listBookmarks().find((bookmark) => bookmark.name.trim().toLowerCase() === preferred);
  if (bookmarkMatch) {
    return {
      value: `bookmark:${bookmarkMatch.name}`,
      title: bookmarkMatch.name,
      target: bookmarkMatch.nodeId,
      targetNodeId: bookmarkMatch.nodeId,
      section: "My Bookmarks",
    };
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(preferred)) {
    const node = getNodeById(preferred);
    return {
      value: `configured:${preferred}`,
      title: node?.name || preferred,
      target: preferred,
      targetNodeId: preferred,
      section: "Configured Default",
    };
  }

  return inbox;
}
