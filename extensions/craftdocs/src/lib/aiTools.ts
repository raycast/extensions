import { environment, getPreferenceValues } from "@raycast/api";
import { buildCraftConfig, loadCraftConfigSnapshot } from "../Config";
import { APPEND_POSITIONS } from "../constants";
import { CraftPreference, getCraftEnvironment } from "./craftEnvironment";
import { closeDatabases, DatabaseWrap, loadDatabases } from "./databaseLoader";
import { findDailyNoteBlockId } from "./dailyNotes";
import { formatCraftInternalDate } from "../utils/dateTimeFormatter";

// Non-React counterpart of useCraftCommandContext, used by AI tools.
export const loadCraftSnapshot = async () => {
  const preferences = getPreferenceValues<Preferences>();
  const craftEnvironment = await getCraftEnvironment(preferences.application as unknown as CraftPreference);

  if (craftEnvironment.status !== "ready") {
    throw new Error(`Craft is not available (${craftEnvironment.status}). Install Craft and let it finish syncing.`);
  }

  const snapshot = loadCraftConfigSnapshot(craftEnvironment);

  return { snapshot, config: buildCraftConfig(snapshot) };
};

export const withCraftDatabases = async <T>(
  run: (craft: Awaited<ReturnType<typeof loadCraftSnapshot>> & { databases: DatabaseWrap[] }) => T | Promise<T>,
) => {
  const craft = await loadCraftSnapshot();
  const { databases, fatalIssue } = await loadDatabases(craft.config.enabledSpaces, environment.assetsPath);

  try {
    if (fatalIssue) {
      throw new Error(fatalIssue.message);
    }

    return await run({ ...craft, databases });
  } finally {
    closeDatabases(databases);
  }
};

export const resolveSpaceId = (
  config: Awaited<ReturnType<typeof loadCraftSnapshot>>["config"],
  spaceId: string | undefined,
) => {
  const resolved = spaceId || config.primarySpace?.spaceID;

  if (!resolved) {
    throw new Error("No Craft space found. Open Craft and let it finish syncing.");
  }

  if (!config.enabledSpaces.some((space) => space.spaceID === resolved)) {
    throw new Error(`Craft space "${spaceId}" is unknown or disabled. Use list-spaces to get enabled space IDs.`);
  }

  return resolved;
};

export const buildCreateBlockUrl = ({
  parentBlockId,
  spaceId,
  content,
  position,
}: {
  parentBlockId: string;
  spaceId: string;
  content: string;
  position: "beginning" | "end" | string | undefined;
}) => {
  const index = position === "beginning" ? APPEND_POSITIONS.BEGINNING : APPEND_POSITIONS.END;

  return `craftdocs://createblock?parentBlockId=${encodeURIComponent(parentBlockId)}&spaceId=${encodeURIComponent(
    spaceId,
  )}&content=${encodeURIComponent(content)}&index=${index}`;
};

export const buildCreateDocumentUrl = (spaceId: string, title: string, content = "") =>
  `craftdocs://createdocument?spaceId=${encodeURIComponent(spaceId)}&title=${encodeURIComponent(
    title,
  )}&content=${encodeURIComponent(content)}&folderId=`;

export const buildOpenBlockUrl = (blockId: string, spaceId: string) =>
  `craftdocs://open?blockId=${encodeURIComponent(blockId)}&spaceId=${encodeURIComponent(spaceId)}`;

/** Parses YYYY-MM-DD as a local date; defaults to today. */
export const parseLocalDate = (date: string | undefined) => {
  if (!date) {
    return new Date();
  }

  const parsed = new Date(`${date}T00:00:00`);

  // Round-trip check rejects rolled-over dates like 2026-02-30.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || formatCraftInternalDate(parsed) !== date.replaceAll("-", ".")) {
    throw new Error(`Invalid date "${date}". Use YYYY-MM-DD.`);
  }

  return parsed;
};

/** Re-reads the space's search index from disk, so it picks up notes Craft just created. */
export const findDailyNoteBlockIdFresh = async (
  config: Awaited<ReturnType<typeof loadCraftSnapshot>>["config"],
  spaceId: string,
  date: Date,
) => {
  const spaces = config.spaces.filter((space) => space.spaceID === spaceId);
  const { databases } = await loadDatabases(spaces, environment.assetsPath);

  try {
    return findDailyNoteBlockId(databases, spaceId, date);
  } finally {
    closeDatabases(databases);
  }
};

// ponytail: re-reads the whole index each poll; watch the file mtime instead if large spaces make this slow.
export const waitForDailyNote = async (
  config: Awaited<ReturnType<typeof loadCraftSnapshot>>["config"],
  spaceId: string,
  date: Date,
  { attempts = 10, intervalMs = 1000 } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const blockId = await findDailyNoteBlockIdFresh(config, spaceId, date);

    if (blockId) {
      return blockId;
    }
  }

  return null;
};

/** Builds a Craft API URL, refusing non-HTTPS URLs and paths that escape the configured API so the key never leaks elsewhere. */
export const buildCraftApiUrl = (apiUrl: string, path: string, query?: string) => {
  const base = new URL(apiUrl.replace(/\/+$/, ""));

  if (base.protocol !== "https:") {
    throw new Error("The Craft API URL must start with https://.");
  }

  const url = new URL(`${base.href}${path}`);
  // The search setter percent-encodes "#", so values like RE2 patterns aren't cut off as a fragment.
  // Without a separate query, keep any query already in the path (e.g. "/blocks?id=abc"); an empty one clears it.
  url.search = query ?? url.search;

  if (!path.startsWith("/") || url.origin !== base.origin || !url.pathname.startsWith(`${base.pathname}/`)) {
    throw new Error(`Invalid path "${path}".`);
  }

  return url;
};
