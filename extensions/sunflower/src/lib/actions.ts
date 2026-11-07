export const SUNFLOWER_BUNDLE_ID = "com.sunflower.app";

export type MenuAction = {
  id: string;
  title: string;
  description: string;
  menu: string;
  item: string;
  category: "Views" | "Scan" | "Navigation" | "Selected Item";
  success: string;
};

export const actions: MenuAction[] = [
  {
    id: "rings",
    title: "Show Rings",
    description: "Browse the current folder and two levels below it",
    menu: "View",
    item: "Rings",
    category: "Views",
    success: "Showing Rings in Sunflower",
  },
  {
    id: "treemap",
    title: "Show Treemap",
    description: "Compare the current folder's contents by area",
    menu: "View",
    item: "Treemap",
    category: "Views",
    success: "Showing Treemap in Sunflower",
  },
  {
    id: "list",
    title: "Show List",
    description: "Show the current folder's contents, largest first",
    menu: "View",
    item: "List",
    category: "Views",
    success: "Showing List in Sunflower",
  },
  {
    id: "largest",
    title: "Show Largest Files",
    description:
      "Find the biggest files and bundles beneath the current folder",
    menu: "View",
    item: "Largest",
    category: "Views",
    success: "Showing Largest in Sunflower",
  },
  {
    id: "kinds",
    title: "Show File Kinds",
    description: "Group the current folder's bytes by what they are",
    menu: "View",
    item: "Kinds",
    category: "Views",
    success: "Showing Kinds in Sunflower",
  },
  {
    id: "untouched",
    title: "Show Untouched Files",
    description: "Find files whose contents have not changed in years",
    menu: "View",
    item: "Untouched",
    category: "Views",
    success: "Showing Untouched in Sunflower",
  },
  {
    id: "rescan",
    title: "Rescan Disk",
    description: "Request a fresh scan of the disk selected in Sunflower",
    menu: "File",
    item: "Rescan",
    category: "Scan",
    success: "Rescan requested in Sunflower",
  },
  {
    id: "back",
    title: "Go Back",
    description: "Return to the previous folder in the scan",
    menu: "Go",
    item: "Back",
    category: "Navigation",
    success: "Went back in Sunflower",
  },
  {
    id: "forward",
    title: "Go Forward",
    description: "Return to the next folder in the scan",
    menu: "Go",
    item: "Forward",
    category: "Navigation",
    success: "Went forward in Sunflower",
  },
  {
    id: "enclosing",
    title: "Open Enclosing Folder",
    description: "Go up one folder in the current disk scan",
    menu: "Go",
    item: "Enclosing Folder",
    category: "Navigation",
    success: "Opened enclosing folder in Sunflower",
  },
  {
    id: "quicklook",
    title: "Quick Look Selected Item",
    description: "Preview the item selected in Sunflower",
    menu: "File",
    item: "Quick Look",
    category: "Selected Item",
    success: "Quick Look requested in Sunflower",
  },
  {
    id: "reveal",
    title: "Reveal Selected Item in Finder",
    description: "Reveal the item selected in Sunflower's current scan",
    menu: "File",
    item: "Reveal in Finder",
    category: "Selected Item",
    success: "Reveal in Finder requested",
  },
];

export function getAction(id: string): MenuAction {
  const action = actions.find((candidate) => candidate.id === id);
  if (!action) throw new Error("Unknown Sunflower action");
  return action;
}

export type NativeResult =
  | "ok"
  | "permission"
  | "disabled"
  | "missing"
  | "not-running";

export function parseNativeResult(output: string): NativeResult {
  const result = output.trim();
  if (
    ["ok", "permission", "disabled", "missing", "not-running"].includes(result)
  ) {
    return result as NativeResult;
  }
  throw new Error(
    "Sunflower did not confirm the menu action. Try again after opening its disk screen.",
  );
}

export function resultMessage(result: Exclude<NativeResult, "ok">): string {
  switch (result) {
    case "permission":
      return "Allow Raycast in System Settings → Privacy & Security → Accessibility, then try again.";
    case "disabled":
      return "This action is unavailable in Sunflower right now. Open its disk screen, complete a scan, or select an item first.";
    case "missing":
      return "This menu action could not be found. Use Sunflower 1.2 or later with its English menus.";
    case "not-running":
      return "Sunflower did not become ready. Open its disk screen, then try again.";
  }
}
