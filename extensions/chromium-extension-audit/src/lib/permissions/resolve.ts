import { Dict, object, strings, unique } from "../json";
import { Access, emptyPermissions, Extension } from "../model";
import { knownVersion, permissionSet } from "../chromium/preferences";
import { intersection, normalizePatterns, parsePattern, uncovered } from "./patterns";

export function resolveAccess(
  manifest: Dict,
  entry: Dict,
  enabled: Extension["enabled"],
  version: string,
  conflicts: string[] = [],
): Access {
  const declared = strings(manifest.permissions),
    optional = strings(manifest.optional_permissions);
  const isHost = (value: string) => value === "<all_urls>" || value.includes("://");
  const scripts = Array.isArray(manifest.content_scripts)
    ? manifest.content_scripts.map(object).flatMap((s) => strings(s?.matches))
    : [];
  const requested = {
    api: unique(declared.filter((p) => !isHost(p))),
    hosts: normalizePatterns([...declared.filter(isHost), ...strings(manifest.host_permissions)]),
    scripts: normalizePatterns(scripts, true),
  };
  const optionalSet = {
    api: unique(optional.filter((p) => !isHost(p))),
    hosts: normalizePatterns([...optional.filter(isHost), ...strings(manifest.optional_host_permissions)]),
    scripts: [],
  };
  const active = permissionSet(entry.active_permissions),
    granted = permissionSet(entry.granted_permissions),
    runtime = permissionSet(entry.runtime_granted_permissions);
  const unknown = [...conflicts];
  const malformedDeclarations = [
    "permissions",
    "optional_permissions",
    "host_permissions",
    "optional_host_permissions",
  ].some(
    (key) =>
      manifest[key] !== undefined &&
      (!Array.isArray(manifest[key]) || (manifest[key] as unknown[]).some((value) => typeof value !== "string")),
  );
  if (malformedDeclarations) unknown.push("Manifest permission declarations are malformed.");
  if (!knownVersion(version))
    unknown.push("Chromium engine version is unavailable or outside the validated preference adapter range.");
  if (!active) unknown.push("Active permission metadata is unavailable or invalid.");
  if (!granted) unknown.push("Approved permission metadata is unavailable or invalid.");
  if (entry.runtime_granted_permissions !== undefined && !runtime) unknown.push("Runtime grant metadata is invalid.");
  if (enabled === "Unknown") unknown.push("Enabled state could not be determined.");
  const withholding =
    typeof entry.withholding_permissions === "boolean"
      ? entry.withholding_permissions
      : entry.withholding_permissions === undefined && knownVersion(version)
        ? false
        : null;
  if (withholding === null) unknown.push("Host-permission withholding is unknown.");
  if (
    [
      ...requested.hosts,
      ...requested.scripts,
      ...optionalSet.hosts,
      ...[active, granted, runtime].flatMap((s) => (s ? [...s.hosts, ...s.scripts] : [])),
    ].some((p) => !parsePattern(p))
  )
    unknown.push("Unrecognized host patterns were retained but cannot establish effective access.");
  let effective = emptyPermissions();
  if (active && granted && knownVersion(version) && conflicts.length === 0 && !malformedDeclarations) {
    const approvedApi = unique([...granted.api, ...(runtime?.api ?? [])]);
    const declaredApi = [...requested.api, ...optionalSet.api];
    effective.api = active.api.filter((api) => approvedApi.includes(api) && declaredApi.includes(api));
    const approvedHosts = [...granted.hosts, ...(runtime?.hosts ?? [])];
    const approvedScripts = [...granted.scripts, ...(runtime?.scripts ?? [])];
    if (
      active.api.some((api) => !approvedApi.includes(api)) ||
      uncovered(active.hosts, approvedHosts).length ||
      uncovered(active.scripts, approvedScripts, true).length
    )
      unknown.push("Active and approved permissions disagree; only their confirmed overlap is shown.");
    if (withholding !== null) {
      const hostGrants = withholding ? (runtime?.hosts ?? []) : approvedHosts;
      const scriptGrants = withholding ? (runtime?.scripts ?? []) : approvedScripts;
      effective.hosts = intersection(intersection(active.hosts, hostGrants), [
        ...requested.hosts,
        ...optionalSet.hosts,
      ]);
      effective.scripts = intersection(intersection(active.scripts, scriptGrants, true), requested.scripts, true);
    }
  }
  // file:// requires a separate user grant; restrict all_urls to web schemes here.
  const ordinary = (patterns: string[]) =>
    normalizePatterns(
      patterns.flatMap((p) =>
        p === "<all_urls>"
          ? ["http://*/*", "https://*/*", ...(entry.newAllowFileAccess === true ? ["file:///*"] : [])]
          : parsePattern(p)?.scheme === "file" && entry.newAllowFileAccess !== true
            ? []
            : parsePattern(p)
              ? [p]
              : [],
      ),
      true,
    );
  effective.hosts = ordinary(effective.hosts);
  effective.scripts = ordinary(effective.scripts);
  const conditional =
    requested.api.includes("activeTab") || optionalSet.api.includes("activeTab")
      ? [
          "May gain temporary access to the current site when activated. Static files cannot reveal temporary activeTab grants.",
        ]
      : [];
  if (withholding)
    conditional.push(
      "Site access is withheld except for confirmed persistent runtime grants. Additional temporary access may require user interaction.",
    );
  if (enabled !== "Enabled") effective = emptyPermissions();
  return {
    requested,
    optional: optionalSet,
    active,
    granted,
    runtime,
    effective,
    withholding,
    withheld: withholding ? unique([...requested.hosts, ...requested.scripts]) : [],
    conditional,
    unknown: unique(unknown),
    complete: unknown.length === 0,
  };
}
