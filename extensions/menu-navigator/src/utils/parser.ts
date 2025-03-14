import { Application } from "@raycast/api";
import { MenuGroup, MenuItem } from "../types";

interface ParsedMenuItem extends MenuItem {
  isSectionTitle: boolean;
  section: string;
}

function groupMenuBarItems(items: ParsedMenuItem[]): MenuGroup[] {
  // Step 1: Create menu item hierarchy
  const itemsByPath = createMenuItemHierarchy(items);

  // Step 2: Organize into menu groups
  return buildMenuGroups(itemsByPath);
}

/**
 * Creates a complete hierarchy of menu items from the parsed items
 */
function createMenuItemHierarchy(
  items: ParsedMenuItem[],
): Map<string, MenuItem> {
  const itemsByPath = new Map<string, MenuItem>();

  // First pass: Create all menu items
  for (const item of items) {
    // Skip if already processed
    if (itemsByPath.has(item.path)) continue;

    // Create this item with empty submenu
    const newItem: MenuItem = { ...item, submenu: [] };
    itemsByPath.set(item.path, newItem);

    // Ensure all parent paths exist
    ensureParentPathsExist(item.path, itemsByPath);
  }

  return itemsByPath;
}

/**
 * Ensures all parent paths for a given path exist in the map
 */
function ensureParentPathsExist(
  path: string,
  itemsByPath: Map<string, MenuItem>,
): void {
  const pathParts = path.split(">");

  // Create any missing parent paths
  for (let i = 1; i < pathParts.length; i++) {
    const parentPath = pathParts.slice(0, i).join(">");

    // Skip if already created
    if (itemsByPath.has(parentPath)) continue;

    // Create parent
    const parentMenu = pathParts[i - 1];
    itemsByPath.set(parentPath, {
      path: parentPath,
      menu: parentMenu,
      shortcut: parentMenu,
      modifier: null,
      key: null,
      glyph: null,
      submenu: [],
    });
  }
}

/**
 * Builds menu groups from the hierarchy of menu items
 */
function buildMenuGroups(itemsByPath: Map<string, MenuItem>): MenuGroup[] {
  const topLevelMenus = new Map<string, MenuGroup>();

  // Process items in order of path length (parents before children)
  const sortedItems = Array.from(itemsByPath.values()).sort(
    (a, b) => a.path.split(">").length - b.path.split(">").length,
  );

  for (const item of sortedItems) {
    const pathParts = item.path.split(">");
    const topLevelMenu = pathParts[0];

    // Skip top-level menus themselves
    if (pathParts.length === 1) continue;

    // Get or create top-level menu group
    if (!topLevelMenus.has(topLevelMenu)) {
      topLevelMenus.set(topLevelMenu, { menu: topLevelMenu, items: [] });
    }
    const menuGroup = topLevelMenus.get(topLevelMenu) ?? {
      menu: topLevelMenu,
      items: [],
    };

    if (pathParts.length === 2) {
      // Direct child of top-level menu
      if (!isDuplicate(menuGroup.items, item)) {
        menuGroup.items.push(item);
      }
    } else {
      // Add to parent's submenu
      const parentPath = pathParts.slice(0, -1).join(">");
      const parentItem = itemsByPath.get(parentPath);

      if (!parentItem?.submenu) continue;

      if (parentItem && !isDuplicate(parentItem.submenu, item)) {
        parentItem.submenu.push(item);
      }
    }
  }

  return Array.from(topLevelMenus.values());
}

/*
 * Normalizes text by removing all forms of ellipsis
 */
function normalize(text: string | undefined | null): string {
  if (!text) return "";

  // Handle both Unicode ellipsis (…) and three dots (...) and any variations
  return text.replace(/…|\.{3,}/g, "").trim();
}

/*
 * Checks if an item would be a duplicate in the given array
 */
function isDuplicate(items: MenuItem[], item: MenuItem): boolean {
  return items.some(
    (existing) => normalize(existing.shortcut) === normalize(item.shortcut),
  );
}

/*
 * Extracts a value from a string between start and optional end delimiters
 */
function extract(text: string, start: string, end?: string): string {
  const parts = text.split(start);
  if (parts.length < 2) return "";
  const value = parts[1];
  return end ? (value.split(end)[0] || "").trim() : value.trim();
}

/*
 * Handle "null" values from applescript
 */
function handleNull(val: string): string | null {
  if (val === "null") return null;
  return val;
}

/*
 * Convert code string to number
 */
function convertToNumber(val: string | null): number | null {
  if (!val) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return num;
}

/*
 * Parses the AppleScript response and returns formatted menu data
 */
export function parseAppleScriptResponse(app: Application, response: string) {
  const menuBarItems = response.split("|MN:").slice(1);

  const items = menuBarItems.map((item) => {
    const path = extract(item, "MP:", ":SN");
    const menus = path.split(">");
    const menu = menus.length >= 2 ? menus[menus.length - 2] : "";

    return {
      path,
      menu,
      shortcut: extract(item, "SN:", ":SM"),
      key: handleNull(extract(item, "SK:", ":SG")),
      modifier: convertToNumber(handleNull(extract(item, "SM:", ":SK"))),
      glyph: convertToNumber(handleNull(extract(item, "SG:", ":ST"))),
      isSectionTitle: extract(item, "ST:", ":SEC") === "true",
      section: extract(item, ":SEC:"),
    };
  });

  // Reorder menu groups
  const grouped = groupMenuBarItems(items);
  const menus =
    grouped?.length >= 3
      ? [
          ...grouped.slice(2), // Main groups
          ...grouped.slice(1, 2), // Middle group
          ...grouped.slice(0, 1), // First group
        ]
      : grouped;

  return {
    app,
    menus,
    timestamp: new Date().toISOString(),
  };
}
