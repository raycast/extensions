import { EXTRA_LIBRARY_IDS, extraLibrary } from "./extra-libraries";
import { CoreLibraryId, IconEntry, LibraryId, LibraryInfo, NameFormat } from "./types";

export type { LibraryInfo, NameFormat } from "./types";
export { svgToJsx } from "./svg";

function strokeProp(strokeWidth?: string): string {
  return strokeWidth ? ` strokeWidth={${strokeWidth}}` : "";
}

const CORE_LIBRARIES: Record<CoreLibraryId, LibraryInfo> = {
  hugeicons: {
    title: "Hugeicons",
    placeholder: { ai: "Search Hugeicons by name or meaning…", plain: "Search free Hugeicons…" },
    siteName: "hugeicons.com",
    setting: "libraryHugeicons",
    spinner: ["circle", "square", "triangle"],
    name: (icon, format) => (format === "icon" ? icon.name : icon.exportName),
    pageUrl: (icon) => `https://hugeicons.com/icon/${encodeURIComponent(icon.name)}`,
    reactCode: (icon, strokeWidth) =>
      [
        'import { HugeiconsIcon } from "@hugeicons/react";',
        `import { ${icon.exportName} } from "@hugeicons/core-free-icons";`,
        "",
        `<HugeiconsIcon icon={${icon.exportName}}${strokeProp(strokeWidth)} />`,
      ].join("\n"),
  },
  lucide: {
    title: "Lucide",
    placeholder: { ai: "Search Lucide by name or meaning…", plain: "Search Lucide icons…" },
    siteName: "lucide.dev",
    setting: "libraryLucide",
    spinner: ["circle", "square", "triangle"],
    name: (icon, format) => (format === "icon" ? icon.name : icon.exportName),
    pageUrl: (icon) => `https://lucide.dev/icons/${encodeURIComponent(icon.name)}`,
    reactCode: (icon, strokeWidth) =>
      [
        `import { ${icon.exportName} } from "lucide-react";`,
        "",
        `<${icon.exportName}${strokeProp(strokeWidth)} />`,
      ].join("\n"),
  },
};

export const LIBRARIES = {
  ...CORE_LIBRARIES,
  ...Object.fromEntries(EXTRA_LIBRARY_IDS.map((id) => [id, extraLibrary(id).info])),
} as Record<LibraryId, LibraryInfo>;

/** The search bar's text: it mentions meaning only when Raycast AI can search by it. */
export function searchPlaceholder(library: LibraryId, canUseAi: boolean): string {
  const { placeholder } = LIBRARIES[library];
  return canUseAi ? placeholder.ai : placeholder.plain;
}

/** The name to paste or copy, with the library in front when the Library Name setting asks for it. */
export function iconName(library: LibraryId, icon: IconEntry, format: NameFormat, withLibrary: boolean): string {
  const info = LIBRARIES[library];
  const name = info.name(icon, format);
  return withLibrary ? `${info.title} ${name}` : name;
}

/** Every library, in the order the settings and Switch Library list them. */
export const LIBRARY_IDS: LibraryId[] = ["lucide", "hugeicons", ...EXTRA_LIBRARY_IDS];

/** The libraries the Libraries setting turns on. A switch the settings don't mention counts as on. */
export function enabledLibraries(prefs: object): LibraryId[] {
  const values = prefs as Record<string, unknown>;
  return LIBRARY_IDS.filter((id) => values[LIBRARIES[id].setting] !== false);
}

/**
 * The library to show: the first of `preferred` (the Default Library setting, then the last one used)
 * that is turned on, else the first one turned on. Undefined only when every library is off.
 */
export function currentLibrary(preferred: (string | undefined)[], enabled: LibraryId[]): LibraryId | undefined {
  return enabled.find((id) => id === preferred.find((wanted) => enabled.some((on) => on === wanted))) ?? enabled[0];
}

/** The libraries ⌘L can switch to: every other one turned on. */
export function otherLibraries(enabled: LibraryId[], current: LibraryId): LibraryId[] {
  return enabled.filter((id) => id !== current);
}

// Category ids whose plain title-casing reads wrong.
const CATEGORY_TITLES: Record<string, string> = {
  ai: "AI",
  "add-remove": "Add & Remove",
  "date-time": "Date & Time",
  "download-upload": "Download & Upload",
  "e-commerce": "E-Commerce",
  "files-folders": "Files & Folders",
  "filter-sorting": "Filter & Sorting",
  "food-beverage": "Food & Beverage",
  "image-camera": "Image & Camera",
  "link-unlink": "Link & Unlink",
  "login-logout": "Login & Logout",
  "notes-tasks": "Notes & Tasks",
  "science-technology": "Science & Technology",
};

export function categoryTitle(id: string): string {
  return (
    CATEGORY_TITLES[id] ??
    id.replace(/(^|-)(\w)/g, (_, dash: string, letter: string) => (dash ? " " : "") + letter.toUpperCase())
  );
}
