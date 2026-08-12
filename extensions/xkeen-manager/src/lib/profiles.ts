import { runRemote } from "./ssh";
import { readRemoteFile, writeRemoteFile, createRemoteBackup, restoreRemoteBackup } from "./files";
import { tryParseJson } from "./json";
import { getPaths, shQuote, cleanOutput } from "./utils";

export type ProfileMeta = {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  lastAppliedAt?: string;
  lastKnownGood?: boolean;
  sourceProfile?: string;
};

export type ProfilesData = {
  active: string;
  names: string[];
  metaByName: Record<string, ProfileMeta>;
};

export function validateProfileName(name: string): string | null {
  if (!name) return "Profile name is required";
  if (name.length > 128) return "Profile name is too long (max 128)";
  if (name.startsWith(".")) return "Profile name cannot start with '.'";
  if (/[/\0]/.test(name)) return "Profile name cannot contain '/' or null byte";
  return null;
}

export async function readProfileMeta(profilesDir: string, profileName: string): Promise<ProfileMeta | null> {
  const profileErr = validateProfileName(profileName);
  if (profileErr) return null;
  const path = `${profilesDir}/${profileName}/.meta.json`;
  try {
    const text = await readRemoteFile(path);
    const parsed = tryParseJson(text);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return null;
    return parsed.value as ProfileMeta;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse `___META_START___<name>\n<json>\n___META_END___` blocks emitted by a
// single batched SSH call into a map of profile name -> ProfileMeta.
// Invalid JSON blocks are skipped rather than throwing.
// ---------------------------------------------------------------------------

export function parseProfileMetaBlocks(text: string): Record<string, ProfileMeta> {
  const result: Record<string, ProfileMeta> = {};
  const blockRe = /___META_START___(.+?)\n([\s\S]*?)___META_END___/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(text)) !== null) {
    const name = match[1].trim();
    if (!name) continue;
    const parsed = tryParseJson(match[2]);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") continue;
    result[name] = parsed.value as ProfileMeta;
  }
  return result;
}

export async function writeProfileMeta(
  profilesDir: string,
  profileName: string,
  patch: Partial<ProfileMeta>,
): Promise<void> {
  const profileErr = validateProfileName(profileName);
  if (profileErr) return;
  const existing = (await readProfileMeta(profilesDir, profileName)) ?? {
    name: profileName,
    createdAt: new Date().toISOString(),
  };
  const next: ProfileMeta = {
    ...existing,
    ...patch,
    name: profileName,
    updatedAt: new Date().toISOString(),
  };
  await writeRemoteFile(`${profilesDir}/${profileName}/.meta.json`, JSON.stringify(next, null, 2));
}

// ---------------------------------------------------------------------------
// Lists profile names and reads every profile's .meta.json in a single SSH
// round-trip instead of N sequential calls to readProfileMeta.
// ---------------------------------------------------------------------------

export async function loadProfilesData(): Promise<ProfilesData> {
  const { profilesDir } = getPaths();
  const qProfilesDir = shQuote(profilesDir);
  const { stdout, stderr } = await runRemote(
    `PROFILES_DIR=${qProfilesDir}; mkdir -p "$PROFILES_DIR"; ` +
      `[ -f "$PROFILES_DIR/.active" ] && cat "$PROFILES_DIR/.active" || echo "unknown"; ` +
      `echo "___LIST___"; ` +
      `ls -1 "$PROFILES_DIR" 2>/dev/null | awk '$0 != ".active"' || true; ` +
      `echo "___META___"; ` +
      `for d in "$PROFILES_DIR"/*/; do n=$(basename "$d"); [ -f "$d/.meta.json" ] && { echo "___META_START___$n"; cat "$d/.meta.json"; echo "___META_END___"; }; done`,
  );

  const output = cleanOutput(stdout, stderr).text;
  const [beforeMeta, metaBlock = ""] = output.split("___META___");
  const lines = beforeMeta.split("\n");
  const sepIndex = lines.indexOf("___LIST___");
  const activeName = (sepIndex > 0 ? lines[0] : "unknown").trim();
  const active = validateProfileName(activeName) === null ? activeName : "unknown";
  const names = lines
    .slice(sepIndex + 1)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((name) => validateProfileName(name) === null);
  const metaByName = parseProfileMetaBlocks(metaBlock);

  return { active, names, metaByName };
}

// ---------------------------------------------------------------------------
// Applies a profile: backs up the current outbounds config (best-effort),
// copies the profile's outbounds file into place, updates .active, restarts
// xkeen, and records the applied metadata. On failure, restores the backup
// and restarts (best-effort) before rethrowing so callers can surface the
// error. UI-free by design — callers own toasts/HUDs.
// ---------------------------------------------------------------------------

export async function applyProfile(name: string): Promise<void> {
  const nameErr = validateProfileName(name);
  if (nameErr) throw new Error(nameErr);

  const { configDir, profilesDir } = getPaths();
  const configPath = `${configDir}/04_outbounds.json`;
  const backupPath = await createRemoteBackup(configPath, `profile-switch-${name}`).catch(() => null);

  try {
    const qProfilesDir = shQuote(profilesDir);
    const qConfigDir = shQuote(configDir);
    const qName = shQuote(name);
    await runRemote(
      `set -e; PROFILES_DIR=${qProfilesDir}; CONFIG_DIR=${qConfigDir}; NAME=${qName}; ` +
        `cp -f "$PROFILES_DIR/$NAME/04_outbounds.json" "$CONFIG_DIR/04_outbounds.json" && ` +
        `echo "$NAME" > "$PROFILES_DIR/.active" && ` +
        `xkeen -restart`,
    );
    await writeProfileMeta(profilesDir, name, {
      lastAppliedAt: new Date().toISOString(),
      lastKnownGood: true,
    });
  } catch (e) {
    if (backupPath) {
      try {
        await restoreRemoteBackup(configPath, backupPath);
        await runRemote("xkeen -restart");
      } catch {
        // best-effort rollback
      }
    }
    throw e;
  }
}
