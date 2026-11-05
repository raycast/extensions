import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { Profile } from "../types";

export const chromeRoot = path.join(
  homedir(),
  "Library/Application Support/Google/Chrome",
);

export function isProfileId(id: string) {
  return id === "Default" || /^Profile \d+$/.test(id);
}

export async function discoverProfiles(
  root = chromeRoot,
): Promise<{ profiles: Profile[]; defaultId: string }> {
  let info: Record<string, { name?: string }> = {};
  let lastUsed = "Default";
  try {
    const state = JSON.parse(
      await readFile(path.join(root, "Local State"), "utf8"),
    );
    info = state.profile?.info_cache ?? {};
    lastUsed = state.profile?.last_used ?? "Default";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const directories = await readdir(root);
  const profiles: Profile[] = [];
  for (const id of directories.filter(isProfileId)) {
    if (!(await stat(path.join(root, id))).isDirectory()) continue;
    profiles.push({
      id,
      name: info[id]?.name || id,
      path: path.join(root, id),
    });
  }
  profiles.sort((a, b) =>
    a.id === lastUsed
      ? -1
      : b.id === lastUsed
        ? 1
        : a.name.localeCompare(b.name),
  );
  return {
    profiles,
    defaultId:
      profiles.find((profile) => profile.id === lastUsed)?.id ??
      profiles[0]?.id ??
      "Default",
  };
}
