import { canonical, hash } from "../json";
import { AuditStore, Extension, ProfileSnapshot, Scan } from "../model";
import { compareProfiles } from "./diff";
import { browserName } from "../browsers/registry";

function signature(profile: ProfileSnapshot): string {
  return hash(canonical(profile.extensions.map((extension) => ({ ...extension, observedAt: undefined }))));
}
// Per-file hashes are only needed to explain the next comparison, so history keeps the summary hash.
const withoutFileHashes = (profile: ProfileSnapshot): ProfileSnapshot => ({
  ...profile,
  extensions: profile.extensions.map((e) => (e.code ? { ...e, code: { ...e.code, fileHashes: undefined } } : e)),
});
function lastComplete(
  state: AuditStore,
  profileKey: string,
  extensionKey: string,
  field: "access" | "code" = "access",
): Extension | undefined {
  const history = [
    ...state.snapshots.filter((s) => s.key === profileKey).reverse(),
    ...(state.baselines[profileKey] ? [state.baselines[profileKey]] : []),
  ];
  for (const snapshot of history) {
    const extension = snapshot.extensions.find((e) => e.key === extensionKey);
    if (!extension) return;
    if (extension?.[field]?.complete) return extension;
  }
}
export function reconcile(state: AuditStore, scan: Scan): AuditStore {
  const result = structuredClone(state);
  const accessReferences = (result.accessReferences ??= {});
  const codeReferences = (result.codeReferences ??= {});
  // Seed older stores before successful access observations can expire from history.
  if (!state.accessReferences)
    for (const profile of Object.values(state.latest))
      for (const extension of profile.extensions) {
        const reference = extension.access.complete ? extension : lastComplete(state, profile.key, extension.key);
        if (reference) accessReferences[extension.key] = reference.access;
      }
  // Seed older stores from successful code observations, independently of access quality.
  if (!state.codeReferences)
    for (const profile of Object.values(state.latest))
      for (const extension of profile.extensions) {
        const reference = extension.code?.complete
          ? extension
          : lastComplete(state, profile.key, extension.key, "code");
        if (reference?.code) codeReferences[extension.key] = { version: reference.version, code: reference.code };
      }
  result.revision++;
  result.lastAttempt = scan.at;
  result.diagnostics = [...scan.diagnostics];
  result.notices = [...(scan.notices ?? [])];
  const found = new Set(scan.profiles.map((p) => p.key));
  // A profile absent from discovery is not a read failure, so it does not mark coverage incomplete.
  for (const previous of Object.values(state.latest))
    if (!found.has(previous.key))
      result.notices.push(
        `${browserName(previous.browser)} · ${previous.name}: profile is unavailable. Previous results retained; no removals inferred.`,
      );
  for (const profile of scan.profiles) {
    result.diagnostics.push(
      ...profile.diagnostics.map((d) => `${browserName(profile.browser)} · ${profile.name}: ${d}`),
    );
    if (!(profile.inventoryComplete ?? profile.complete)) continue;
    const previous = result.latest[profile.key];
    const baseline = result.baselines[profile.key];
    const present = new Set(profile.inventoryIds ?? profile.extensions.map((e) => e.id));
    const observed = new Set(profile.extensions.map((e) => e.id));
    const previousIds = new Set(previous?.inventoryIds ?? previous?.extensions.map((e) => e.id));
    // Older stores can distinguish unreported additions from entries in the initial inventory.
    if (previous && !previous.pendingInstallIds && baseline) {
      const baselineIds = new Set(baseline.inventoryIds ?? baseline.extensions.map((e) => e.id));
      previous.pendingInstallIds = [...previousIds].filter(
        (id) => !baselineIds.has(id) && !previous.extensions.some((e) => e.id === id),
      );
    }
    const retained = previous?.extensions.filter((e) => present.has(e.id) && !observed.has(e.id)) ?? [];
    const current: ProfileSnapshot = {
      key: profile.key,
      browser: profile.browser,
      id: profile.id,
      name: profile.name,
      observedAt:
        profile.complete || profile.extensions.length
          ? profile.observedAt
          : (previous?.observedAt ?? profile.observedAt),
      extensions: [...profile.extensions, ...retained].sort((a, b) => a.key.localeCompare(b.key)),
      inventoryIds: [...present].sort(),
      // Initial inventory entries belong to the baseline. Later unreadable additions still need an install event.
      pendingInstallIds: [...present]
        .filter(
          (id) => !observed.has(id) && previous && (previous.pendingInstallIds?.includes(id) || !previousIds.has(id)),
        )
        .sort(),
      complete: profile.complete,
    };
    if (!baseline && (current.extensions.length || profile.complete))
      result.baselines[profile.key] = withoutFileHashes(current);
    else if (baseline) {
      const baselineIds = new Set(baseline.extensions.map((e) => e.id));
      const recovered = profile.extensions.filter(
        (e) => !baselineIds.has(e.id) && baseline.inventoryIds?.includes(e.id),
      );
      if (recovered.length)
        result.baselines[profile.key] = withoutFileHashes({
          ...baseline,
          extensions: [...baseline.extensions, ...recovered],
        });
    }
    if (previous) {
      const ids = new Set(result.events.map((e) => e.id));
      result.events.push(
        ...compareProfiles(
          previous,
          current,
          (key) => accessReferences[key],
          (key) => codeReferences[key],
        ).filter((e) => !ids.has(e.id)),
      );
      if (signature(previous) !== signature(current)) result.snapshots.push(withoutFileHashes(previous));
      const currentKeys = new Set(current.extensions.map((e) => e.key));
      for (const extension of previous.extensions)
        if (!currentKeys.has(extension.key)) {
          delete accessReferences[extension.key];
          delete codeReferences[extension.key];
        }
    }
    // Keep comparison points through failed/partial scans and history expiry.
    for (const extension of current.extensions) {
      if (extension.access.complete) accessReferences[extension.key] = extension.access;
      if (extension.code?.complete)
        codeReferences[extension.key] = { version: extension.version, code: extension.code };
    }
    result.latest[profile.key] = current;
  }
  if (scan.discoveryComplete && scan.profiles.length > 0 && scan.profiles.every((p) => p.complete))
    result.lastSuccess = scan.at;
  const now = Date.parse(scan.at);
  result.snapshots = result.snapshots.filter((s) => now - Date.parse(s.observedAt) < 90 * 86400000);
  result.events = result.events.filter(
    (e) => (!e.reviewedAt && e.attention !== "Informational") || now - Date.parse(e.at) < 180 * 86400000,
  );
  return result;
}
