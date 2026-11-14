import { ChangeEvent, CodeSignal, Extension, Finding, unreviewed } from "../model";
import { broad } from "../permissions/patterns";
import { VERIFICATION_FLAGS } from "../chromium/preferences";

export const SENSITIVE_APIS = [
  "cookies",
  "scripting",
  "webRequest",
  "webRequestBlocking",
  "nativeMessaging",
  "debugger",
  "proxy",
  "management",
  "privacy",
  "declarativeNetRequest",
  "declarativeNetRequestWithHostAccess",
  "clipboardRead",
  "history",
  "downloads",
];
export function evaluate(extension: Extension): Finding[] {
  const findings: Finding[] = [];
  const { effective } = extension.access;
  const api = (p: string) => effective.api.includes(p);
  const hosts = broad(effective.hosts);
  function add(
    id: string,
    title: string,
    explanation: string,
    evidence: string[],
    category: Finding["category"] = "Capability",
    attention: Finding["attention"] = "Review",
    action = "Review whether this capability and site access are necessary.",
    confidence: Finding["confidence"] = "Confirmed",
  ) {
    findings.push({
      id,
      title,
      explanation,
      evidence,
      category,
      attention,
      confidence,
      action:
        extension.provenance === "Policy-managed"
          ? "This extension is managed by an organization. Contact its administrator about access changes."
          : action,
    });
  }
  if (api("cookies") && hosts)
    add(
      "CAP-001",
      "Cookie access across websites",
      "May access cookies, including session data, for permitted sites. This does not establish that cookies have been read.",
      ["Enabled", "cookies is active and approved", ...effective.hosts],
    );
  if (broad(effective.scripts))
    add(
      "CAP-002",
      "Content scripts across websites",
      `Can read or modify matching webpages. ${extension.contentScriptRestrictions ? "Additional path, exclusion, or glob restrictions apply; matches are an upper bound." : "Browser-protected pages remain restricted."}`,
      ["Enabled", "Confirmed scriptable hosts", ...effective.scripts],
    );
  if (api("scripting") && hosts)
    add(
      "CAP-003",
      "Script injection across websites",
      "Can programmatically inject scripts into permitted pages, subject to browser restrictions.",
      ["scripting is active and approved", ...effective.hosts],
    );
  if (api("webRequest") && effective.hosts.length)
    add(
      "CAP-004",
      "Network request observation",
      "May observe permitted network requests. Blocking and modification depend on additional permissions and browser restrictions.",
      ["webRequest is active and approved", ...effective.hosts],
    );
  if (api("declarativeNetRequest") || api("declarativeNetRequestWithHostAccess"))
    add(
      "CAP-005",
      "Declarative network rules",
      "May block or modify eligible requests using declarative rules. This permission alone does not allow reading request contents.",
      ["Active and approved declarativeNetRequest capability"],
      "Capability",
      "Informational",
    );
  const single: [string, string, string, string][] = [
    [
      "nativeMessaging",
      "CAP-006",
      "Native application communication",
      "Can communicate with compatible native hosts if they are installed and configured.",
    ],
    [
      "debugger",
      "CAP-007",
      "Powerful debugging capability",
      "Can attach to eligible browser targets using the debugging API, which can expose page and network data.",
    ],
    [
      "proxy",
      "CAP-008",
      "Proxy configuration",
      "Can influence how the browser connects to the network through supported proxy settings.",
    ],
    [
      "management",
      "CAP-009",
      "Extension management",
      "Can inspect or manage other extensions within browser API restrictions.",
    ],
    [
      "privacy",
      "CAP-010",
      "Privacy settings control",
      "Can change browser privacy settings supported by the privacy API.",
    ],
  ];
  for (const [permission, id, title, explanation] of single)
    if (api(permission)) add(id, title, explanation, [`${permission} is active and approved`, "Enabled"]);
  if (broad(extension.externalMatches))
    add(
      "CAP-011",
      "External website messaging",
      "The manifest permits matching websites to initiate extension messages. The extension's own message handling determines the impact.",
      extension.externalMatches,
      "Capability",
      "Informational",
    );
  if (extension.manifestVersion === 2)
    add(
      "CAP-012",
      "Legacy Manifest V2",
      "Uses a legacy extension model. Availability depends on the installed browser version and policy; this is not evidence of maliciousness.",
      ["manifest_version: 2"],
      "Capability",
      "Informational",
    );
  if (["Developer / unpacked", "External / sideloaded"].includes(extension.provenance))
    add(
      "PROV-001",
      "Installed outside the normal store flow",
      "The installation source deserves review. It does not establish malicious intent.",
      [extension.provenance, `location: ${extension.location}`],
      "Provenance",
      "Review",
      "Confirm that you recognize this installation source.",
    );
  if (extension.provenance === "Policy-managed")
    add(
      "PROV-002",
      "Managed by an organization",
      "Browser policy controls this extension. You may not be able to disable or remove it.",
      [`location: ${extension.location}`],
      "Provenance",
      "Informational",
    );
  if (extension.blocklisted && extension.enabled === "Disabled")
    add(
      "PROV-003",
      "Browser security restriction recorded",
      "Recognized blocklist or greylist metadata indicates a browser security restriction. Inspect the browser's details for its explanation.",
      [`disable_reasons: ${extension.disableReasons.join(", ")}`, "Recognized blocklist metadata"],
      "Provenance",
      "Review now",
      "Review the browser's explanation in extension settings.",
    );
  const listed = (extension.securityFlags ?? []).filter((flag) => !VERIFICATION_FLAGS.includes(flag));
  if (listed.length && !findings.some((f) => f.id === "PROV-003"))
    add(
      "PROV-004",
      "Browser blocklist state recorded",
      `The browser recorded Safe Browsing or Web Store blocklist metadata for this extension.${extension.enabled === "Enabled" ? " It is currently enabled." : ""} Inspect the browser's details for its explanation.`,
      listed,
      "Provenance",
      extension.enabled === "Enabled" ? "Review now" : "Review",
      "Review the browser's explanation and consider removing the extension.",
    );
  const unverified = (extension.securityFlags ?? []).filter((flag) => VERIFICATION_FLAGS.includes(flag));
  if (unverified.length)
    add(
      "PROV-005",
      "Extension files could not be verified",
      "The browser disabled this extension because its installed files did not match the expected contents or its installation could not be verified. Files may have been modified outside the browser.",
      [...unverified, `disable_reasons: ${extension.disableReasons.join(", ")}`],
      "Provenance",
      "Review now",
      "Confirm the extension's source, then repair or reinstall it from the browser.",
    );
  const enabled = extension.enabled === "Enabled";
  if (enabled && extension.settingsOverrides?.length)
    add(
      "CAP-013",
      "Overrides search or startup settings",
      "Replaces the default search engine, homepage, or startup pages. A search override sends typed searches to the listed host. The browser may ask whether to keep these changes.",
      extension.settingsOverrides,
      "Capability",
      "Review",
      "Confirm that you chose this search engine or homepage.",
    );
  if (enabled && extension.pageOverrides?.length)
    add(
      "CAP-014",
      "Replaces a browser page",
      "Shows the extension's own page instead of the browser's built-in page. This alone grants no additional data access.",
      extension.pageOverrides,
      "Capability",
      "Informational",
    );
  const purpose = BENIGN_PURPOSE.exec(`${extension.name} ${extension.description}`);
  const unrelated = effective.api.filter((p) => UNRELATED_APIS.includes(p));
  if (purpose && unrelated.length)
    add(
      "PURP-001",
      "Capabilities exceed the described purpose",
      `Describes itself as a cosmetic or appearance extension but holds capabilities that such extensions rarely need. This is a heuristic based on the name and description, which may be incomplete.`,
      [`Described as “${purpose[0]}”`, ...unrelated.map((p) => `${p} is active and approved`)],
      "Capability",
      "Review",
      "Check whether the extension's stated purpose explains these capabilities.",
    );
  const signal = (id: CodeSignal["id"]) => extension.code?.signals.find((s) => s.id === id);
  const codeEvidence = (found: CodeSignal) => [`${found.count} matches`, ...found.files.map((f) => `File: ${f}`)];
  const remote = signal("remote-code"),
    obfuscated = signal("obfuscation"),
    dynamic = signal("dynamic-code"),
    payload = signal("encoded-payload");
  const inspect = "Inspect the listed files or ask the developer what this code does.";
  if (remote)
    add(
      "CODE-001",
      "Loads code from remote servers",
      "The installed code references scripts loaded from remote URLs. Manifest V3 forbids remotely hosted code, and remote code can change behavior without an extension update. Matches can come from unused library code.",
      codeEvidence(remote),
      "Capability",
      "Review now",
      inspect,
      "Partial",
    );
  if (obfuscated)
    add(
      "CODE-002",
      "Obfuscated code",
      "Contains identifiers typical of JavaScript obfuscators. Chrome Web Store policy prohibits obfuscation; ordinary minification is allowed.",
      codeEvidence(obfuscated),
      "Provenance",
      "Review",
      inspect,
      "Partial",
    );
  if (dynamic)
    add(
      "CODE-003",
      "Dynamic code evaluation",
      `Uses eval, new Function, or string timers. This is common in bundled libraries${remote ? "; together with remote code loading it can run code that was not part of the installed package" : ""}.`,
      codeEvidence(dynamic),
      "Capability",
      remote ? "Review" : "Informational",
      inspect,
      "Partial",
    );
  if (payload)
    add(
      "CODE-004",
      "Large encoded data in code",
      "Contains long high-entropy encoded strings that are not image or font data. Packed or encrypted payloads hide code from review; bundled assets can also look like this.",
      codeEvidence(payload),
      "Provenance",
      "Informational",
      inspect,
      "Partial",
    );
  return findings;
}
// Appearance-only purposes. Page modification is expected for these, so only unrelated APIs count.
const BENIGN_PURPOSE =
  /\b(themes?|fonts?|wallpapers?|backgrounds?|new ?tab|cursors?|emojis?|stickers?|icon packs?|colou?r pickers?|dark mode|clock)\b/i;
const UNRELATED_APIS = [
  "cookies",
  "history",
  "clipboardRead",
  "webRequest",
  "webRequestBlocking",
  "debugger",
  "proxy",
  "nativeMessaging",
  "management",
  "privacy",
  "browsingData",
  "downloads",
  "tabCapture",
  "desktopCapture",
  "pageCapture",
];

export const LAYERS = ["Security", "Privacy", "Trust"] as const;
export type Layer = (typeof LAYERS)[number];
const layers: Record<string, Layer> = {
  "CAP-001": "Privacy",
  "CAP-004": "Privacy",
  "CAP-010": "Privacy",
  "CAP-013": "Privacy",
  "CAP-012": "Trust",
  "PURP-001": "Trust",
  "CODE-002": "Trust",
  "CODE-004": "Trust",
};
export const layerOf = (finding: Finding): Layer =>
  layers[finding.id] ?? (finding.category === "Provenance" ? "Trust" : "Security");

export const RISK_LEVELS = ["High", "Medium", "Low", "None"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type Risk = { overall: RiskLevel; layers: Record<Layer, RiskLevel>; uncertain: boolean };
// Heuristic (Partial) findings count one level lower than confirmed ones.
export function findingRisk(finding: Finding): RiskLevel {
  const level = finding.attention === "Review now" ? 0 : finding.attention === "Review" ? 1 : 2;
  return RISK_LEVELS[Math.min(level + (finding.confidence === "Partial" ? 1 : 0), 2)];
}
const highest = (levels: RiskLevel[]): RiskLevel =>
  RISK_LEVELS[Math.min(RISK_LEVELS.length - 1, ...levels.map((level) => RISK_LEVELS.indexOf(level)))];
// A qualitative rating of recorded capabilities and provenance, not a malware probability.
export function risk(extension: Extension): Risk {
  const layers = Object.fromEntries(
    LAYERS.map((layer) => [layer, highest(extension.findings.filter((f) => layerOf(f) === layer).map(findingRisk))]),
  ) as Record<Layer, RiskLevel>;
  return { overall: highest(Object.values(layers)), layers, uncertain: !extension.access.complete };
}
// Sort order: unreviewed actionable changes first, then risk.
export function priority(extension: Extension, events: ChangeEvent[]): number {
  const pending = unreviewed(events.filter((e) => e.extensionKey === extension.key));
  const changes = pending.some((e) => e.attention === "Review now") ? 0 : pending.length ? 1 : 2;
  return changes * RISK_LEVELS.length + RISK_LEVELS.indexOf(risk(extension).overall);
}
