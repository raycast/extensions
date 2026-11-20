import { promises as fs } from "node:fs";
import path from "node:path";
import { canonical, Dict, hash, object, strings, unique } from "../json";
import { Extension, ProfileScan, Scan } from "../model";
import {
  chromeTime,
  extensionState,
  knownVersion,
  PROFILE_ID,
  provenance,
  settingsFrom,
  SUPPORTED_MAJOR,
  validatedVersion,
} from "../chromium/preferences";
import { contained, missing, readError, readJson, readText, safePath } from "../chromium/files";
import { resolveAccess } from "../permissions/resolve";
import { evaluate } from "../rules/evaluate";
import { contentScriptDeclarations, normalizedManifest, pageOverrides, settingsOverrides } from "../chromium/manifest";
import { BrowserAdapter } from "../browsers/registry";
import { analyzeCode } from "../code/analyze";

type Preferences = {
  entries: Record<string, Dict>;
  conflicts: Record<string, string[]>;
  sources: string[];
  diagnostics: string[];
  complete: boolean;
  signature: string;
  contextWarnings: string[];
};
async function preferences(root: string): Promise<Preferences> {
  const result: Preferences = {
    entries: {},
    conflicts: {},
    sources: [],
    diagnostics: [],
    complete: true,
    signature: "",
    contextWarnings: [],
  };
  for (const filename of ["Preferences", "Secure Preferences"]) {
    try {
      const { data } = await readJson(root, path.join(root, filename));
      const extensions = object(data.extensions);
      const userPermissions = object(extensions?.user_permissions);
      if (
        userPermissions &&
        ["restricted_sites", "permitted_sites"].some(
          (key) =>
            userPermissions[key] !== undefined &&
            (!Array.isArray(userPermissions[key]) || (userPermissions[key] as unknown[]).length > 0),
        )
      ) {
        result.contextWarnings.push(
          "Browser-wide site-access overrides are recorded. Their feature and policy context is unavailable; verify effective access in the browser.",
        );
      }
      const settings = settingsFrom(data);
      if (!settings) continue;
      result.sources.push(filename);
      for (const [id, entry] of Object.entries(settings)) {
        const previous = result.entries[id];
        if (previous) {
          const conflicts = Object.keys(entry).filter(
            (key) => previous[key] !== undefined && canonical(previous[key]) !== canonical(entry[key]),
          );
          if (conflicts.length) result.conflicts[id] = [`Preference sources disagree: ${conflicts.join(", ")}.`];
        }
        result.entries[id] = { ...previous, ...entry };
      }
    } catch (error) {
      if (!missing(error)) {
        result.diagnostics.push(`${filename}: ${readError(error)}.`);
        result.complete = false;
      }
    }
  }
  if (!result.sources.length) {
    result.complete = false;
    result.diagnostics.push("No validated extension settings dictionary is available. Inventory cannot be reconciled.");
  }
  result.signature = hash(canonical([result.entries, result.contextWarnings]));
  return result;
}

async function localized(
  root: string,
  manifestRoot: string | undefined,
  manifest: Dict,
): Promise<{ name: string; description: string }> {
  let name = typeof manifest.name === "string" ? manifest.name : "";
  let description = typeof manifest.description === "string" ? manifest.description : "";
  if (!manifestRoot || !/__MSG_/.test(name + description)) return { name, description };
  const localeRoot = path.join(manifestRoot, "_locales");
  let locales = [typeof manifest.default_locale === "string" ? manifest.default_locale : "en", "en", "en_US"];
  try {
    locales.push(...(await fs.readdir(await safePath(root, localeRoot))).sort());
  } catch {
    /* Optional display metadata. */
  }
  locales = [...new Set(locales)].filter((locale) => /^[a-zA-Z_@-]+$/.test(locale)).slice(0, 12);
  for (const locale of locales) {
    try {
      const { data } = await readJson(root, path.join(localeRoot, locale, "messages.json"));
      const messages = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key.toLowerCase(), object(value)?.message]),
      );
      const resolve = (text: string) =>
        text.replace(/__MSG_([\w@]+)__/gi, (raw, key: string) =>
          typeof messages[key.toLowerCase()] === "string" ? (messages[key.toLowerCase()] as string) : raw,
        );
      name = resolve(name);
      description = resolve(description);
      if (!/__MSG_/.test(name + description)) break;
    } catch {
      /* Keep the raw metadata if localization is unavailable. */
    }
  }
  return { name, description };
}

async function inspectExtension(
  root: string,
  id: string,
  entry: Dict,
  profile: ProfileScan,
  version: string,
  prefs: Preferences,
  checks: (() => Promise<void>)[],
  analyze = false,
): Promise<Extension> {
  const diagnostics = [...(prefs.conflicts[id] ?? [])];
  const cachedManifest = object(entry.manifest);
  let manifest = cachedManifest ?? {};
  let rawHash = "",
    manifestRoot: string | undefined;
  const origin = provenance(entry, version);
  const extensionRoot = path.join(root, "Extensions", id);
  const configured = typeof entry.path === "string" ? path.resolve(root, "Extensions", entry.path) : undefined;
  if (configured && !contained(root, configured)) {
    // Unpacked paths are intentionally not followed outside a validated profile.
    diagnostics.push("The configured extension path is outside this profile. Only persisted metadata was inspected.");
  } else {
    let candidate = configured;
    if (!candidate) {
      const folders = await fs.readdir(await safePath(root, extensionRoot), { withFileTypes: true });
      const matches = folders.filter(
        (f) =>
          f.isDirectory() &&
          /^\d+(?:\.\d+)*(?:_\d+)?$/.test(f.name) &&
          (!cachedManifest?.version || f.name.replace(/_\d+$/, "") === cachedManifest.version),
      );
      if (matches.length !== 1) throw new Error("Active extension version cannot be selected unambiguously");
      candidate = path.join(extensionRoot, matches[0].name);
    }
    manifestRoot = await safePath(root, candidate);
    const read = await readJson(root, path.join(manifestRoot, "manifest.json"));
    if (typeof read.data.version !== "string" || ![2, 3].includes(Number(read.data.manifest_version)))
      throw new Error("Manifest identity is missing or unsupported");
    if (cachedManifest?.version && cachedManifest.version !== read.data.version)
      throw new Error("Manifest version disagrees with preferences; an update may be in progress");
    manifest = read.data;
    rawHash = hash(read.raw);
    const filename = path.join(manifestRoot, "manifest.json"),
      expectedHash = rawHash;
    checks.push(async () => {
      if (hash(await readText(root, filename)) !== expectedHash)
        throw new Error("Manifest changed during scan; previous profile snapshot preserved");
    });
  }
  if (!rawHash)
    diagnostics.push("Manifest integrity and content-script configuration could not be verified from disk.");
  const state = extensionState(entry, version);
  const display = await localized(root, manifestRoot, manifest);
  const capabilityKeys = [
    "permissions",
    "optional_permissions",
    "host_permissions",
    "optional_host_permissions",
    "content_scripts",
    "externally_connectable",
  ];
  const capabilityManifest = (value: Dict) =>
    Object.fromEntries(capabilityKeys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
  const cachedMismatch =
    cachedManifest &&
    rawHash &&
    normalizedManifest(capabilityManifest(cachedManifest)) !== normalizedManifest(capabilityManifest(manifest));
  const access = resolveAccess(manifest, entry, state.enabled, version, [
    ...(prefs.conflicts[id] ?? []),
    ...prefs.contextWarnings,
    ...(cachedMismatch
      ? [
          "Cached manifest capabilities disagree with the on-disk declarations. The running configuration cannot be confirmed.",
        ]
      : []),
    ...(!rawHash ? ["The on-disk manifest was not inspected."] : []),
  ]);
  let icon: string | undefined;
  const icons = object(manifest.icons);
  const iconValue =
    icons && ["128", "64", "48", "32", "16"].map((size) => icons[size]).find((v) => typeof v === "string");
  if (manifestRoot && typeof iconValue === "string" && /\.(png|jpe?g|webp)$/i.test(iconValue)) {
    try {
      icon = await safePath(manifestRoot, path.resolve(manifestRoot, iconValue));
    } catch {
      /* Native fallback icon. */
    }
  }
  let code: Extension["code"];
  if (analyze && manifestRoot && rawHash) {
    try {
      code = await analyzeCode(manifestRoot);
    } catch (error) {
      diagnostics.push(`Code analysis failed: ${readError(error)}.`);
    }
  }
  const contentScripts = Array.isArray(manifest.content_scripts) ? manifest.content_scripts : [];
  const extension: Extension = {
    key: `${profile.key}:${id}`,
    browser: profile.browser,
    profile: profile.id,
    profileName: profile.name,
    id,
    name: display.name || id,
    description: display.description,
    version: typeof manifest.version === "string" ? manifest.version : "Unknown",
    manifestVersion: Number(manifest.manifest_version) || 0,
    icon,
    ...state,
    location: typeof entry.location === "number" ? entry.location : null,
    provenance: origin,
    fromWebstore: typeof entry.from_webstore === "boolean" ? entry.from_webstore : null,
    updateUrl: typeof manifest.update_url === "string" ? manifest.update_url : "",
    installedAt: chromeTime(entry.first_install_time),
    updatedAt: chromeTime(entry.last_update_time),
    rawHash,
    normalizedHash: rawHash ? hash(normalizedManifest(manifest)) : "",
    contentScriptsHash: hash(canonical(contentScripts)),
    contentScripts: contentScriptDeclarations(manifest),
    externalMatches: strings(object(manifest.externally_connectable)?.matches),
    settingsOverrides: settingsOverrides(manifest),
    pageOverrides: pageOverrides(manifest),
    code,
    contentScriptRestrictions: contentScripts.some((value) => {
      const script = object(value);
      return script && ["exclude_matches", "include_globs", "exclude_globs"].some((k) => strings(script[k]).length > 0);
    }),
    access,
    findings: [],
    observedAt: profile.observedAt,
    sources: [...prefs.sources, ...(rawHash ? ["manifest.json"] : [])],
    diagnostics,
  };
  extension.findings = evaluate(extension);
  return extension;
}

export async function scanChromium(
  inputRoot: string,
  options: {
    now?: string;
    includeComponents?: boolean;
    browser?: Pick<BrowserAdapter, "id" | "name">;
    analyzeCode?: boolean;
  } = {},
): Promise<Scan> {
  const browser = options.browser ?? { id: "chrome", name: "Google Chrome" };
  const at = options.now ?? new Date().toISOString();
  const notices: string[] = [];
  const scan: Scan = { at, profiles: [], diagnostics: [], notices, discoveryComplete: true };
  let root: string;
  try {
    root = await fs.realpath(inputRoot);
    await fs.readdir(root);
  } catch (error) {
    scan.discoveryComplete = false;
    scan.diagnostics.push(
      missing(error)
        ? `No ${browser.name} user-data directory was found. Open ${browser.name} to create a profile, then scan again.`
        : `${browser.name} profiles could not be accessed: ${readError(error)}. Run diagnostics from Raycast to check its file access.`,
    );
    return scan;
  }
  const directories = await fs.readdir(root, { withFileTypes: true });
  const safeProfileName = (name: string) =>
    /^[^/\\.][^/\\\0]*$/.test(name) && name !== "System Profile" && name !== "Guest Profile";
  const candidates = await Promise.all(
    directories
      .filter((entry) => entry.isDirectory() && safeProfileName(entry.name))
      .map(async (entry) => {
        if (PROFILE_ID.test(entry.name)) return entry.name;
        for (const filename of ["Preferences", "Secure Preferences"]) {
          try {
            await fs.lstat(path.join(root, entry.name, filename));
            return entry.name;
          } catch {
            /* Not a discoverable profile. */
          }
        }
      }),
  );
  const fallbackIds = candidates.filter((name): name is string => name !== undefined);
  // Empty leftovers from an uninstalled browser are not coverage failures.
  if (!fallbackIds.length && !directories.some((entry) => ["Local State", "Last Version"].includes(entry.name)))
    return scan;
  let names: Dict = {};
  try {
    names = object(object((await readJson(root, path.join(root, "Local State"))).data.profile)?.info_cache) ?? {};
  } catch (error) {
    scan.diagnostics.push(`${browser.name} Local State: ${readError(error)}. Using profile-directory discovery.`);
  }
  let version = "";
  try {
    version = (await readText(root, path.join(root, "Last Version"), 1024)).trim();
  } catch {
    scan.diagnostics.push(
      `${browser.name}: Chromium engine version is unavailable; provenance and access may be unknown.`,
    );
  }
  if (version && !knownVersion(version))
    scan.diagnostics.push(
      `${browser.name}: Chromium engine version is outside the validated adapter range; access is shown conservatively.`,
    );
  else if (version && !validatedVersion(version))
    notices.push(
      `${browser.name}: Chromium engine ${version.split(".")[0]} is newer than the validated range (up to ${SUPPORTED_MAJOR.max}); preferences are interpreted with the latest known schema.`,
    );
  const ids = unique([...Object.keys(names).filter(safeProfileName), ...fallbackIds]);
  for (const id of ids) {
    const profile: ProfileScan = {
      key: `${browser.id}:${id}`,
      browser: browser.id,
      id,
      name: typeof object(names[id])?.name === "string" ? (object(names[id])!.name as string) : id,
      observedAt: at,
      extensions: [],
      inventoryIds: [],
      inventoryComplete: false,
      complete: true,
      diagnostics: [],
    };
    try {
      const profileRoot = await safePath(root, path.join(root, id));
      const prefs = await preferences(profileRoot);
      const checks: (() => Promise<void>)[] = [];
      profile.complete = prefs.complete;
      profile.inventoryComplete = prefs.complete;
      profile.diagnostics.push(...prefs.diagnostics);
      for (const [extensionId, entry] of Object.entries(prefs.entries)) {
        // Old preference schemas leave uninstalled entries behind with state 3.
        if (entry.state === 3) continue;
        if (!options.includeComponents && provenance(entry, version) === "Browser component") continue;
        profile.inventoryIds!.push(extensionId);
        try {
          const extension = await inspectExtension(
            profileRoot,
            extensionId,
            entry,
            profile,
            version,
            prefs,
            checks,
            options.analyzeCode,
          );
          profile.extensions.push(extension);
          if (prefs.conflicts[extensionId]) {
            profile.complete = false;
            profile.inventoryComplete = false;
            profile.diagnostics.push(`${extensionId}: conflicting preference sources; previous snapshot preserved.`);
          }
        } catch (error) {
          profile.complete = false;
          profile.diagnostics.push(`${extensionId}: ${readError(error)}. Previous snapshot preserved.`);
        }
      }
      for (const check of checks) await check();
      const after = await preferences(profileRoot);
      if (!after.complete || prefs.signature !== after.signature) {
        profile.complete = false;
        profile.inventoryComplete = false;
        profile.diagnostics.push(
          "Extension preferences changed during the scan. This profile was not committed; scan again after the browser finishes updating.",
        );
      }
    } catch (error) {
      profile.complete = false;
      profile.inventoryComplete = false;
      profile.diagnostics.push(readError(error));
    }
    scan.profiles.push(profile);
  }
  if (!ids.length) scan.diagnostics.push(`${browser.name}: no accessible profiles were discovered.`);
  return scan;
}
