import { AuditStore, ChangeEvent, Extension, Finding, unreviewed } from "./model";
import { findingRisk, LAYERS, layerOf, Risk, risk, RISK_LEVELS, RiskLevel } from "./rules/evaluate";
import { covers } from "./permissions/patterns";
import { browserFromProfileKey, browserName } from "./browsers/registry";

export const escape = (value: string) => value.replace(/[\\`*_{}[\]()<>#!|]/g, "\\$&");
const lines = (values: string[], fallback = "None recorded") =>
  values.length ? values.map((v) => `- ${escape(v)}`).join("\n") : fallback;
const jsonBlock = (value: unknown) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
const NO_FINDINGS = "No configured rule matched the confirmed metadata. This is not a safety assessment.";
function riskLine(e: Extension, events: ChangeEvent[]): string {
  const { overall, uncertain } = risk(e);
  const pending = unreviewed(events.filter((event) => event.extensionKey === e.key)).length;
  return [
    `**${overall === "None" ? "No findings" : `${overall} risk`}**`,
    ...(pending ? [plural(pending, "unreviewed change")] : []),
    ...(e.enabled === "Disabled" ? ["Disabled; grants apply if re-enabled"] : []),
    ...(uncertain ? ["Access partly unknown"] : []),
  ].join(" · ");
}
const layerSummary = (r: Risk) => LAYERS.map((layer) => `${layer}: ${r.layers[layer]}`).join(" · ");
function findingMarkdown(f: Finding, limit: number, heading: string): string {
  return `${heading} ${escape(f.title)}\n\n${f.attention} · ${f.confidence} evidence\n\n${escape(f.explanation)}\n\n${lines(f.evidence.slice(0, limit))}${f.evidence.length > limit ? "\n\nAdditional evidence is available in Full Permission Evidence." : ""}\n\n**Suggested action:** ${escape(f.action)}`;
}
// Findings grouped by Security, Privacy, and Trust. Layers carry no score.
function layeredFindings(findings: Finding[], limit: number, heading: string): string {
  if (!findings.length) return `${heading} Findings\n\n${NO_FINDINGS}`;
  return LAYERS.map((layer) => {
    const matched = findings.filter((f) => layerOf(f) === layer);
    return `${heading} ${layer} · ${matched.length ? RISK_LEVELS[Math.min(...matched.map((f) => RISK_LEVELS.indexOf(findingRisk(f))))] : "None"}\n\n${matched.length ? matched.map((f) => findingMarkdown(f, limit, `${heading}#`)).join("\n\n") : "No findings in this layer."}`;
  }).join("\n\n");
}
function codeMarkdown(e: Extension, hostLimit: number): string {
  const code = e.code;
  if (!code)
    return "## Code analysis\n\nNot analyzed. Enable **Code Analysis** in the extension preferences to inspect installed code locally.";
  const size = `${code.files} files, ${(code.bytes / 1024 / 1024).toFixed(1)} MB`;
  const hosts = code.hosts.length
    ? `${lines(code.hosts.slice(0, hostLimit))}${code.hosts.length > hostLimit ? `\n\n…and ${code.hosts.length - hostLimit} more hosts.` : ""}`
    : "None found";
  return `## Code analysis\n\n${code.complete ? `Analyzed ${size}.` : `**Partially analyzed** (${size}).`} Patterns are heuristics; a referenced host is not proof of a connection.\n\n**Referenced remote hosts**\n\n${hosts}${code.limits.length ? `\n\n**Limits**\n\n${lines(code.limits)}` : ""}${code.skipped.length ? `\n\n**Not pattern-checked**\n\n${lines(code.skipped)}` : ""}`;
}
const inline = (values: string[], limit: number, fallback = "None") =>
  values.length
    ? `${escape(values.slice(0, limit).join(", "))}${values.length > limit ? ` (+${values.length - limit} more)` : ""}`
    : fallback;
function compactHosts(patterns: string[]): string[] {
  return patterns.filter(
    (pattern, index) =>
      !patterns.some(
        (other, otherIndex) =>
          otherIndex !== index && covers(other, pattern, true) && (!covers(pattern, other, true) || otherIndex < index),
      ),
  );
}
// The overview shows only non-empty sections; Full Permission Evidence keeps the exhaustive view.
export function overviewMarkdown(e: Extension, events: ChangeEvent[]): string {
  const a = e.access;
  const ranked = [...e.findings].sort(
    (x, y) => RISK_LEVELS.indexOf(findingRisk(x)) - RISK_LEVELS.indexOf(findingRisk(y)),
  );
  const actionable = ranked.filter((f) => f.attention !== "Informational");
  const noted = ranked.filter((f) => f.attention === "Informational");
  const findings = actionable.length
    ? actionable
        .map(
          (f) =>
            `**${escape(f.title)}** · ${layerOf(f)} · ${findingRisk(f)}\n\n${escape(f.explanation)}\n\nEvidence: ${inline(f.evidence, 4)}`,
        )
        .join("\n\n")
    : NO_FINDINGS;
  const also = noted.length
    ? `\n\n**Also noted:** ${noted.map((f) => `${escape(f.title)} (${layerOf(f)})`).join(", ")}`
    : "";
  const access = [
    `- **Hosts:** ${inline(compactHosts(a.effective.hosts), 6)}`,
    `- **Content scripts:** ${inline(compactHosts(a.effective.scripts), 6)}${e.contentScriptRestrictions ? " (upper bound; exclusions apply)" : ""}`,
    `- **APIs:** ${inline(a.effective.api, 12)}`,
    ...(a.withholding ? ["- Site access is restricted; only confirmed runtime grants are shown."] : []),
    ...a.conditional
      .filter((note) => !a.withholding || !note.startsWith("Site access"))
      .map((note) => `- ${escape(note)}`),
  ].join("\n");
  const code = e.code
    ? `\n\n## Code\n\n${e.code.complete ? "" : "**Partially analyzed.** "}${plural(e.code.files, "file")} · ${(e.code.bytes / 1024 / 1024).toFixed(1)} MB · Hosts: ${inline(e.code.hosts, 8)}`
    : "";
  const changes = events.length
    ? `\n\n## Recent changes\n\n${events
        .slice(-5)
        .reverse()
        .map(
          (event) =>
            `- ${escape(event.title)} — ${event.reviewedAt ? "Reviewed" : event.attention} · ${new Date(event.at).toLocaleDateString()}`,
        )
        .join("\n")}`
    : "";
  const uncertain = [...a.unknown, ...e.diagnostics];
  return `# ${escape(e.name)}\n\n${e.description ? `${escape(e.description.slice(0, 200))}${e.description.length > 200 ? "…" : ""}\n\n` : ""}${riskLine(e, events)}\n\n## Findings\n\n${findings}${also}\n\n## Site access\n\n${access}${code}${changes}${uncertain.length ? `\n\n## Uncertain evidence\n\n${lines(uncertain)}` : ""}\n\n---\n\nCapabilities show what an extension can do, not what it does. **Full Permission Evidence** lists every pattern, grant, and hash.`;
}
export function eventMarkdown(event: ChangeEvent): string {
  return `## ${escape(event.title)}\n\n${escape(event.extensionName)} · ${escape(browserFromProfileKey(event.profileKey))} · ${escape(event.profileName)}\n\n${event.attention} · ${new Date(event.at).toLocaleString()} · ${event.reviewedAt ? "Reviewed" : event.attention === "Informational" ? "Informational" : "Unreviewed"}\n\n### Before\n\n${lines(event.before)}\n\n### After\n\n${lines(event.after)}\n\nA capability or configuration change is not evidence that the extension used that capability.\n`;
}
export function extensionMarkdown(extension: Extension, events: ChangeEvent[] = [], baseline?: Extension): string {
  const e = extension,
    a = e.access;
  return `# ${escape(e.name)}\n\n${escape(browserName(e.browser))} · ${escape(e.profileName)}\n\n${riskLine(e, events)} · ${layerSummary(risk(e))}\n\n${escape(e.description)}\n\n${e.enabled === "Disabled" ? "**Currently disabled.** Configured permissions may apply if re-enabled." : a.complete ? "Best-effort observable persistent access. Capabilities do not establish actual behavior." : "**Access could not be fully determined.** Confirmed observations are shown below."}\n\n## Website access\n\n### Requested hosts\n\n${lines(a.requested.hosts)}\n\n### Requested content-script matches\n\n${lines(a.requested.scripts)}\n\n### Optional hosts\n\n${lines(a.optional.hosts)}\n\n### Approved hosts (may include historical grants)\n\n${lines(a.granted ? [...a.granted.hosts, ...a.granted.scripts] : [], a.granted ? "None recorded" : "Unknown")}\n\n### Desired active host configuration\n\n${lines(a.active ? [...a.active.hosts, ...a.active.scripts] : [], a.active ? "None recorded" : "Unknown")}\n\n### Observable effective hosts\n\n${lines(a.effective.hosts)}\n\n### Observable effective content-script matches\n\n${lines(a.effective.scripts)}\n\n${e.contentScriptRestrictions ? "Content-script paths, exclusions, and glob restrictions also apply. The patterns above are an upper bound.\n\n" : ""}### Withheld requests\n\n${lines(a.withheld)}\n\n${a.withholding ? "Persistent runtime grants listed below are exceptions to withholding.\n\n" : ""}### Persistent runtime grants\n\n${lines(a.runtime ? [...a.runtime.hosts, ...a.runtime.scripts] : [], a.runtime ? "None recorded" : "No runtime grant metadata recorded")}\n\n### Conditional access\n\n${lines(a.conditional, "No temporary access declaration observed")}\n\nBrowser-protected pages are restricted. Temporary grants inside the running browser are not observable here. File URLs require a separate browser grant.\n\n## API permissions\n\n**Requested:** ${escape(a.requested.api.join(", ") || "None")}\n\n**Optional:** ${escape(a.optional.api.join(", ") || "None")}\n\n**Approved:** ${escape(a.granted?.api.join(", ") ?? "Unknown")}\n\n**Desired active:** ${escape(a.active?.api.join(", ") ?? "Unknown")}\n\n**Runtime-granted:** ${escape(a.runtime?.api.join(", ") ?? "None recorded")}\n\n**Observable effective:** ${escape(a.effective.api.join(", ") || "None confirmed")}\n\n${layeredFindings(e.findings, Infinity, "##")}\n\n## Browser overrides\n\n${lines([...(e.settingsOverrides ?? []), ...(e.pageOverrides ?? [])])}\n\n## Content-script declarations\n\n${jsonBlock(e.contentScripts)}\n\n${codeMarkdown(e, Infinity)}${e.code ? `\n\n**Code SHA-256:** ${e.code.hash}` : ""}\n\n## Evidence quality\n\n${lines([...a.unknown, ...e.diagnostics], "No metadata inconsistencies detected.")}\n\n**Sources:** ${escape(e.sources.join(", "))}\n\n**Raw manifest SHA-256:** ${e.rawHash || "Unavailable"}\n\n**Normalized manifest SHA-256:** ${e.normalizedHash || "Unavailable"}\n\n**Update URL:** ${escape(e.updateUrl || "None recorded")}\n\n## Initial baseline\n\n${baseline ? `First observed ${new Date(baseline.observedAt).toLocaleString()}, version ${escape(baseline.version)}.\n\n**Initial requested hosts:**\n\n${lines(baseline.access.requested.hosts)}\n\n**Initial effective hosts:**\n\n${lines([...baseline.access.effective.hosts, ...baseline.access.effective.scripts])}\n\n**Initial effective APIs:** ${escape(baseline.access.effective.api.join(", ") || "None confirmed")}` : "No baseline is available for this observation."}\n\n## Change history\n\n${events.length ? events.slice().reverse().map(eventMarkdown).join("\n\n---\n\n") : "No changes recorded. Existing capabilities were not treated as newly acquired access."}`;
}
export function statusMarkdown(state: AuditStore): string {
  const profiles = Object.values(state.latest);
  return `# Chromium Extensions Audit\n\n${profiles.length ? "Your initial security baseline has been created. Changes will appear after future scans." : "A baseline will be created after a profile is successfully scanned."}\n\n## Monitoring\n\n${state.monitoringLastRun ? `The menu-bar command last ran ${new Date(state.monitoringLastRun).toLocaleString()}. Check Raycast command settings for whether background refresh is currently enabled.` : "Open **Extension Changes** once to activate menu-bar monitoring."}\n\nRefresh is best-effort, normally hourly. Monitoring requires Raycast to be running and background refresh enabled. Immediate alerts and exact scheduling are not guaranteed.\n\n**Last attempt:** ${state.lastAttempt ? new Date(state.lastAttempt).toLocaleString() : "Not yet scanned"}\n\n**Last complete scan:** ${state.lastSuccess ? new Date(state.lastSuccess).toLocaleString() : "Not yet completed"}\n\n## Coverage\n\n${lines(
    profiles.map(
      (p) =>
        `${browserName(p.browser)} · ${p.name}: ${p.extensions.length} inspected of ${p.inventoryIds?.length ?? p.extensions.length} entries${p.complete === false ? " (partial; unreadable entries retain their last observation)" : ""}, last observation ${new Date(p.observedAt).toLocaleString()}`,
    ),
    "No successful profile scans yet",
  )}\n\n## Diagnostics\n\n${lines(state.diagnostics, "No scan errors reported.")}\n\n${state.notices.length ? `## Notices\n\n${lines(state.notices)}\n\n` : ""}Inaccessible profiles retain their previous observations. Missing profiles never imply extension removal. Core scanning reads local extension metadata only and does not upload inventory or read history, cookies, or passwords.\n\n## Review and retention\n\nThe menu-bar count includes unreviewed actionable change events, not static findings. Reviewing preserves history. Original baselines are kept until reset; changed snapshots are retained for 90 days and reviewed/informational events for 180 days. Unreviewed actionable events are retained.\n\nReset Baseline recreates monitoring history after confirmation. The previous audit is kept locally as audit-before-reset.json for recovery.`;
}
function inventory(state: AuditStore) {
  const pending = unreviewed(state.events);
  return Object.values(state.latest)
    .flatMap((p) => p.extensions)
    .map((extension) => ({
      extension,
      risk: risk(extension),
      changes: pending.filter((e) => e.extensionKey === extension.key),
    }))
    .sort(
      (a, b) =>
        RISK_LEVELS.indexOf(a.risk.overall) - RISK_LEVELS.indexOf(b.risk.overall) ||
        a.extension.name.localeCompare(b.extension.name),
    );
}
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const cell = (value: string) => escape(value.replace(/\s+/g, " "));
const layerCell = (level: RiskLevel, findings: Finding[]) => (findings.length ? `${level} (${findings.length})` : "—");
// A shareable snapshot of the latest inventory. Generated only when the user exports it.
export function auditReportMarkdown(state: AuditStore, at = new Date().toISOString()): string {
  const items = inventory(state);
  const counts = RISK_LEVELS.map((v) => `${v} risk: ${items.filter((i) => i.risk.overall === v).length}`).join(" · ");
  const table = [
    "| Extension | Browser · Profile | State | Source | Risk | Security | Privacy | Trust |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...items.map(({ extension: e, risk }) => {
      const byLayer = LAYERS.map((layer) =>
        layerCell(
          risk.layers[layer],
          e.findings.filter((f) => layerOf(f) === layer),
        ),
      );
      return `| ${cell(e.name)} ${cell(e.version)} | ${cell(`${browserName(e.browser)} · ${e.profileName}`)} | ${e.enabled} | ${cell(e.provenance)} | ${risk.overall}${risk.uncertain ? " (partial)" : ""} | ${byLayer.join(" | ")} |`;
    }),
  ].join("\n");
  const details = items
    .filter((i) => i.extension.findings.length || i.changes.length || i.extension.code?.hosts.length)
    .map(({ extension: e, risk, changes }) => {
      const findings = LAYERS.flatMap((layer) =>
        e.findings
          .filter((f) => layerOf(f) === layer)
          .map(
            (f) =>
              `- **${layer} · ${findingRisk(f)}:** ${escape(f.title)}. ${escape(f.explanation)}\n${f.evidence
                .slice(0, 6)
                .map((v) => `  - ${escape(v)}`)
                .join("\n")}`,
          ),
      );
      const pending = changes.map((c) => `- **Unreviewed change · ${c.attention}:** ${escape(c.title)}`);
      const hosts = e.code?.hosts.length
        ? [
            `- **Referenced hosts:** ${escape(e.code.hosts.slice(0, 15).join(", "))}${e.code.hosts.length > 15 ? ` and ${e.code.hosts.length - 15} more` : ""}`,
          ]
        : [];
      return `### ${escape(e.name)}\n\n${escape(browserName(e.browser))} · ${escape(e.profileName)} · ${escape(e.id)} · **${risk.overall} risk** (${layerSummary(risk)})\n\n${[...findings, ...pending, ...hosts].join("\n")}`;
    })
    .join("\n\n");
  return `# Chromium Extensions Audit Report\n\nGenerated ${new Date(at).toLocaleString()}. Last complete scan: ${state.lastSuccess ? new Date(state.lastSuccess).toLocaleString() : "not yet completed"}.\n\n${plural(items.length, "extension")} across ${plural(Object.keys(state.latest).length, "profile")}. ${counts}.\n\nFindings describe capabilities, configuration, and provenance from local browser metadata. They are not malware verdicts, and a capability is not evidence of use.\n\n## Summary\n\n${table}\n\n## Details\n\n${details || NO_FINDINGS}\n\n## Coverage\n\n${lines(state.diagnostics, "No scan errors reported.")}${state.notices.length ? `\n\n${lines(state.notices)}` : ""}\n`;
}
export function auditReportJson(state: AuditStore, at = new Date().toISOString()): string {
  return JSON.stringify(
    {
      format: "chromium-extensions-audit-report",
      version: 1,
      generatedAt: at,
      lastSuccess: state.lastSuccess ?? null,
      diagnostics: state.diagnostics,
      notices: state.notices,
      extensions: inventory(state).map(({ extension: e, risk, changes }) => ({
        id: e.id,
        name: e.name,
        version: e.version,
        browser: e.browser,
        profile: e.profileName,
        enabled: e.enabled,
        provenance: e.provenance,
        risk,
        accessComplete: e.access.complete,
        effective: e.access.effective,
        findings: e.findings.map((f) => ({
          id: f.id,
          layer: layerOf(f),
          risk: findingRisk(f),
          title: f.title,
          attention: f.attention,
          confidence: f.confidence,
          evidence: f.evidence,
        })),
        code: e.code
          ? {
              complete: e.code.complete,
              files: e.code.files,
              bytes: e.code.bytes,
              hash: e.code.hash,
              hosts: e.code.hosts,
              signals: e.code.signals,
              limits: e.code.limits,
              skipped: e.code.skipped,
            }
          : null,
        unreviewedChanges: changes.map((c) => ({ type: c.type, title: c.title, attention: c.attention, at: c.at })),
      })),
    },
    null,
    2,
  );
}
