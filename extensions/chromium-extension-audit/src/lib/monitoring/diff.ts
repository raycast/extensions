import { canonical, hash, unique } from "../json";
import { Access, Attention, ChangeEvent, CodeReference, Extension, ProfileSnapshot } from "../model";
import { uncovered } from "../permissions/patterns";
import { SENSITIVE_APIS } from "../rules/evaluate";

// `reference` is the latest observation with complete access, used when `previous` was incomplete so that
// access gained across an incomplete scan is still reported.
// Code has an independent reference because access and code analysis can fail separately.
export function compareExtension(
  previous: Extension,
  current: Extension,
  reference?: Access,
  codeReference?: CodeReference,
): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  function change(type: string, title: string, before: string[], after: string[], attention: Attention) {
    if (canonical(before) === canonical(after)) return;
    events.push(makeEvent(current, type, title, before, after, attention, previous.observedAt));
  }
  const old = previous.access,
    next = current.access;
  if (old.complete && !next.complete)
    change(
      "CHG-quality",
      "Access can no longer be fully determined",
      ["Previously complete metadata"],
      next.unknown,
      "Review",
    );
  const known = old.complete ? old : reference?.complete ? reference : undefined;
  if (known && next.complete) {
    const effective = known.effective;
    const expanded = [
      ...uncovered(next.effective.hosts, effective.hosts),
      ...uncovered(next.effective.scripts, effective.scripts, true),
    ];
    const narrowed = [
      ...uncovered(effective.hosts, next.effective.hosts),
      ...uncovered(effective.scripts, next.effective.scripts, true),
    ];
    const describe = (access: Access) => [
      ...access.effective.hosts.map((p) => `Host: ${p}`),
      ...access.effective.scripts.map((p) => `Content script: ${p}`),
    ];
    if (expanded.length)
      change("CHG-001", "Observable persistent website access expanded", describe(known), describe(next), "Review now");
    if (narrowed.length)
      change(
        "CHG-013",
        "Observable persistent website access narrowed",
        describe(known),
        describe(next),
        "Informational",
      );
    const added = next.effective.api.filter((p) => SENSITIVE_APIS.includes(p) && !effective.api.includes(p));
    if (added.length)
      change(
        "CHG-002",
        `Sensitive permission became effective: ${added.join(", ")}`,
        effective.api,
        next.effective.api,
        "Review now",
      );
  }
  if (uncovered(next.requested.hosts, old.requested.hosts).length)
    change(
      "CHG-003",
      "Requested website access expanded; grants are shown separately",
      old.requested.hosts,
      next.requested.hosts,
      "Review",
    );
  else if (uncovered(old.requested.hosts, next.requested.hosts).length)
    change("CHG-014", "Requested website access narrowed", old.requested.hosts, next.requested.hosts, "Informational");
  change("CHG-004", "Requested API permissions changed", old.requested.api, next.requested.api, "Review");
  if (uncovered(next.requested.scripts, old.requested.scripts, true).length)
    change("CHG-005", "Content-script matches expanded", old.requested.scripts, next.requested.scripts, "Review");
  else if (previous.contentScriptsHash !== current.contentScriptsHash)
    change(
      "CHG-015",
      "Content-script configuration changed",
      previous.contentScripts.map((script) => JSON.stringify(script)),
      current.contentScripts.map((script) => JSON.stringify(script)),
      "Review",
    );
  change("CHG-006", "Update URL changed", [previous.updateUrl || "None"], [current.updateUrl || "None"], "Review");
  if (previous.version === current.version && previous.normalizedHash && current.normalizedHash)
    change(
      "CHG-007",
      "Manifest changed without a version increment",
      [previous.normalizedHash],
      [current.normalizedHash],
      "Review",
    );
  change("CHG-011", "Installed version changed", [previous.version], [current.version], "Informational");
  if (previous.enabled !== "Unknown" && current.enabled !== "Unknown")
    change(
      current.enabled === "Enabled" ? "CHG-009" : "CHG-010",
      `Extension ${current.enabled.toLowerCase()}`,
      [previous.enabled],
      [current.enabled],
      current.enabled === "Enabled" && current.findings.some((f) => f.attention !== "Informational")
        ? "Review"
        : "Informational",
    );
  if (previous.provenance !== "Unknown" && current.provenance !== "Unknown")
    change(
      "CHG-012",
      "Installation source changed",
      [previous.provenance, String(previous.location)],
      [current.provenance, String(current.location)],
      "Review",
    );
  for (const field of ["granted", "active", "runtime"] as const) {
    const explained = events.some((e) =>
      ["CHG-001", "CHG-002", "CHG-003", "CHG-004", "CHG-005", "CHG-013", "CHG-014"].includes(e.type),
    );
    if (old[field] && next[field])
      change(
        `CHG-${field}`,
        `${field === "runtime" ? "Runtime-granted" : field === "active" ? "Active configuration" : "Approved"} permissions changed`,
        permissionEvidence(old[field]),
        permissionEvidence(next[field]),
        explained ? "Informational" : "Review",
      );
  }
  if (old.withholding !== null && next.withholding !== null)
    change(
      "CHG-withholding",
      "Site-access restriction changed",
      [String(old.withholding)],
      [String(next.withholding)],
      events.some((e) => e.type === "CHG-001" || e.type === "CHG-013") ? "Informational" : "Review",
    );
  change(
    "CHG-optional",
    "Optional permission declarations changed",
    permissionEvidence(old.optional),
    permissionEvidence(next.optional),
    "Informational",
  );
  // Fields missing from older saved observations are skipped rather than reported as additions.
  function listChange(
    type: string,
    before: string[] | undefined,
    after: string[] | undefined,
    [addedTitle, removedTitle]: [string, string],
    addedAttention: Attention,
  ) {
    if (!before || !after) return;
    const added = after.filter((value) => !before.includes(value));
    change(
      type,
      added.length ? addedTitle : removedTitle,
      before,
      after,
      added.length ? addedAttention : "Informational",
    );
  }
  const flagged = (current.securityFlags ?? []).filter((flag) => !previous.securityFlags?.includes(flag));
  listChange(
    "CHG-security-flags",
    previous.securityFlags,
    current.securityFlags,
    [`Browser security flag recorded: ${flagged.join(", ")}`, "Browser security flags cleared"],
    "Review now",
  );
  listChange(
    "CHG-017",
    previous.settingsOverrides,
    current.settingsOverrides,
    ["Search or startup settings override added", "Search or startup settings override removed"],
    "Review now",
  );
  listChange(
    "CHG-018",
    previous.pageOverrides,
    current.pageOverrides,
    ["Browser page override added", "Browser page override removed"],
    "Review",
  );
  const codeBefore = previous.code?.complete ? previous : codeReference;
  const [oldCode, newCode] = [codeBefore?.code, current.code];
  if (oldCode?.complete && newCode?.complete) {
    if (codeBefore?.version === current.version && oldCode.hash !== newCode.hash)
      change(
        "CHG-019",
        "Extension code changed without a version increment",
        [`Code hash: ${oldCode.hash}`],
        [`Code hash: ${newCode.hash}`, ...fileChanges(oldCode.fileHashes, newCode.fileHashes)],
        "Review now",
      );
    listChange(
      "CHG-020",
      oldCode.hosts,
      newCode.hosts,
      ["Code references new remote hosts", "Code no longer references some remote hosts"],
      "Review",
    );
    const added = newCode.signals.filter((s) => !oldCode.signals.some((o) => o.id === s.id)).map((s) => s.id);
    listChange(
      "CHG-021",
      oldCode.signals.map((s) => s.id),
      newCode.signals.map((s) => s.id),
      [`New code pattern detected: ${added.join(", ")}`, "Code pattern no longer detected"],
      added.some((id) => id === "remote-code" || id === "obfuscation") ? "Review now" : "Review",
    );
  }
  change(
    "CHG-disable-reasons",
    "Browser disable reasons changed",
    previous.disableReasons.map(String),
    current.disableReasons.map(String),
    current.blocklisted ? "Review now" : "Informational",
  );
  return events;
}
function fileChanges(before?: Record<string, string>, after?: Record<string, string>): string[] {
  if (!before || !after) return [];
  const changes = unique([...Object.keys(before), ...Object.keys(after)]).flatMap((file) =>
    !(file in before)
      ? [`Added: ${file}`]
      : !(file in after)
        ? [`Removed: ${file}`]
        : before[file] !== after[file]
          ? [`Changed: ${file}`]
          : [],
  );
  return changes.length > 20 ? [...changes.slice(0, 20), `…and ${changes.length - 20} more files`] : changes;
}
function permissionEvidence(set: Extension["access"]["requested"]): string[] {
  return unique([
    ...set.api.map((p) => `API: ${p}`),
    ...set.hosts.map((p) => `Host: ${p}`),
    ...set.scripts.map((p) => `Content script: ${p}`),
  ]);
}
function makeEvent(
  extension: Extension,
  type: string,
  title: string,
  before: string[],
  after: string[],
  attention: Attention,
  anchor: string,
): ChangeEvent {
  return {
    id: hash(canonical([extension.key, type, before, after, anchor])),
    extensionKey: extension.key,
    extensionId: extension.id,
    extensionName: extension.name,
    profileName: extension.profileName,
    profileKey: `${extension.browser}:${extension.profile}`,
    type,
    title,
    before,
    after,
    attention,
    at: extension.observedAt,
  };
}
export function compareProfiles(
  previous: ProfileSnapshot,
  current: ProfileSnapshot,
  reference: (key: string) => Access | undefined = () => undefined,
  codeReference: (key: string) => CodeReference | undefined = () => undefined,
): ChangeEvent[] {
  const old = new Map(previous.extensions.map((e) => [e.key, e]));
  const next = new Map(current.extensions.map((e) => [e.key, e]));
  const events: ChangeEvent[] = [];
  for (const extension of current.extensions) {
    const before = old.get(extension.key);
    if (before)
      events.push(...compareExtension(before, extension, reference(extension.key), codeReference(extension.key)));
    else if (previous.pendingInstallIds?.includes(extension.id) || !previous.inventoryIds?.includes(extension.id))
      events.push(
        makeEvent(
          extension,
          "CHG-008",
          "Extension newly observed",
          [],
          [extension.version, extension.provenance],
          extension.findings.some((f) => f.attention !== "Informational") ? "Review" : "Informational",
          previous.observedAt,
        ),
      );
  }
  for (const extension of previous.extensions)
    if (!next.has(extension.key))
      events.push(
        makeEvent(
          { ...extension, observedAt: current.observedAt },
          "CHG-016",
          "Extension removed",
          [extension.version],
          [],
          "Informational",
          previous.observedAt,
        ),
      );
  return events;
}
