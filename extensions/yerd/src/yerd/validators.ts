// Zero-dependency runtime validators for `yerd --json` responses.
// Each validator checks the `type` discriminator (where present) plus the
// required top-level keys, and spot-checks element shapes for array payloads.
// `ping` intentionally has no validator.

import type {
  StatusResponse,
  SitesResponse,
  PhpVersionsResponse,
  PhpAvailableResponse,
  ServicesResponse,
  ServiceAvailableResponse,
  ProxiesResponse,
  MailListResponse,
  ToolsResponse,
  TunnelStatusResponse,
  LanStatusResponse,
  DoctorResponse,
} from "./types";

function asObject(x: unknown, label: string): Record<string, unknown> {
  if (typeof x !== "object" || x === null)
    throw new Error(`${label}: not an object`);
  return x as Record<string, unknown>;
}

function requireType(
  o: Record<string, unknown>,
  expected: string,
  label: string,
): void {
  if (o.type !== expected)
    throw new Error(`${label}: type is not "${expected}"`);
}

function requireArray(
  o: Record<string, unknown>,
  key: string,
  label: string,
): unknown[] {
  if (!Array.isArray(o[key])) throw new Error(`${label}: missing ${key} array`);
  return o[key] as unknown[];
}

export function assertStatusShape(x: unknown): asserts x is StatusResponse {
  const s = asObject(x, "StatusResponse");
  requireType(s, "status", "StatusResponse");
  const report = asObject(s.report, "StatusResponse.report");
  if (typeof report.daemon_version !== "string")
    throw new Error("StatusResponse: missing report.daemon_version");
  if (typeof report.tld !== "string")
    throw new Error("StatusResponse: missing report.tld");
  if (typeof report.uptime_secs !== "number")
    throw new Error("StatusResponse: missing report.uptime_secs");
}

export function assertSitesShape(x: unknown): asserts x is SitesResponse {
  const s = asObject(x, "SitesResponse");
  requireType(s, "sites", "SitesResponse");
  for (const item of requireArray(s, "sites", "SitesResponse")) {
    const site = asObject(item, "SitesResponse.sites[]");
    if (typeof site.name !== "string")
      throw new Error("SitesResponse: site missing name");
    if (typeof site.document_root !== "string")
      throw new Error("SitesResponse: site missing document_root");
  }
}

export function assertPhpShape(x: unknown): asserts x is PhpVersionsResponse {
  const s = asObject(x, "PhpVersionsResponse");
  requireType(s, "php_versions", "PhpVersionsResponse");
  requireArray(s, "installed", "PhpVersionsResponse");
  if (typeof s.default !== "string")
    throw new Error("PhpVersionsResponse: missing default");
  asObject(s.settings, "PhpVersionsResponse.settings");
}

export function assertPhpAvailableShape(
  x: unknown,
): asserts x is PhpAvailableResponse {
  const s = asObject(x, "PhpAvailableResponse");
  requireType(s, "available_php", "PhpAvailableResponse");
  requireArray(s, "available", "PhpAvailableResponse");
  requireArray(s, "installed", "PhpAvailableResponse");
}

export function assertServicesShape(x: unknown): asserts x is ServicesResponse {
  const s = asObject(x, "ServicesResponse");
  requireType(s, "services", "ServicesResponse");
  for (const item of requireArray(s, "services", "ServicesResponse")) {
    const svc = asObject(item, "ServicesResponse.services[]");
    if (typeof svc.service !== "string")
      throw new Error("ServicesResponse: service missing service id");
    if (typeof svc.state !== "string")
      throw new Error("ServicesResponse: service missing state");
  }
}

export function assertServiceAvailableShape(
  x: unknown,
): asserts x is ServiceAvailableResponse {
  const s = asObject(x, "ServiceAvailableResponse");
  requireType(s, "available_services", "ServiceAvailableResponse");
  for (const item of requireArray(s, "services", "ServiceAvailableResponse")) {
    const svc = asObject(item, "ServiceAvailableResponse.services[]");
    if (typeof svc.service !== "string")
      throw new Error("ServiceAvailableResponse: entry missing service id");
    if (!Array.isArray(svc.available))
      throw new Error(
        "ServiceAvailableResponse: entry missing available array",
      );
  }
}

export function assertProxiesShape(x: unknown): asserts x is ProxiesResponse {
  const s = asObject(x, "ProxiesResponse");
  requireType(s, "proxies", "ProxiesResponse");
  for (const item of requireArray(s, "proxies", "ProxiesResponse")) {
    const proxy = asObject(item, "ProxiesResponse.proxies[]");
    if (typeof proxy.name !== "string")
      throw new Error("ProxiesResponse: proxy missing name");
    if (typeof proxy.target !== "string")
      throw new Error("ProxiesResponse: proxy missing target");
  }
  for (const item of requireArray(s, "rules", "ProxiesResponse")) {
    const rule = asObject(item, "ProxiesResponse.rules[]");
    if (typeof rule.site !== "string")
      throw new Error("ProxiesResponse: rule missing site");
    if (typeof rule.prefix !== "string")
      throw new Error("ProxiesResponse: rule missing prefix");
  }
}

export function assertMailListShape(x: unknown): asserts x is MailListResponse {
  const s = asObject(x, "MailListResponse");
  requireType(s, "mails", "MailListResponse");
  for (const item of requireArray(s, "mails", "MailListResponse")) {
    const mail = asObject(item, "MailListResponse.mails[]");
    if (typeof mail.id !== "string")
      throw new Error("MailListResponse: mail missing id");
    if (typeof mail.subject !== "string")
      throw new Error("MailListResponse: mail missing subject");
  }
}

export function assertToolsShape(x: unknown): asserts x is ToolsResponse {
  const s = asObject(x, "ToolsResponse");
  requireType(s, "tools", "ToolsResponse");
  for (const item of requireArray(s, "tools", "ToolsResponse")) {
    const tool = asObject(item, "ToolsResponse.tools[]");
    if (typeof tool.id !== "string")
      throw new Error("ToolsResponse: tool missing id");
    if (typeof tool.installed !== "boolean")
      throw new Error("ToolsResponse: tool missing installed");
  }
}

export function assertTunnelStatusShape(
  x: unknown,
): asserts x is TunnelStatusResponse {
  const s = asObject(x, "TunnelStatusResponse");
  requireType(s, "tunnels", "TunnelStatusResponse");
  requireArray(s, "tunnels", "TunnelStatusResponse");
  const cloudflared = asObject(
    s.cloudflared,
    "TunnelStatusResponse.cloudflared",
  );
  if (typeof cloudflared.installed !== "boolean")
    throw new Error("TunnelStatusResponse: missing cloudflared.installed");
}

export function assertLanStatusShape(
  x: unknown,
): asserts x is LanStatusResponse {
  // NOTE: `lan status` is the one response without a `type` discriminator.
  const s = asObject(x, "LanStatusResponse");
  if (typeof s.lan_enabled !== "boolean")
    throw new Error("LanStatusResponse: missing lan_enabled");
  if (!("lan_ip" in s)) throw new Error("LanStatusResponse: missing lan_ip");
}

export function assertDoctorShape(x: unknown): asserts x is DoctorResponse {
  const s = asObject(x, "DoctorResponse");
  requireType(s, "diagnoses", "DoctorResponse");
  for (const item of requireArray(s, "items", "DoctorResponse")) {
    const finding = asObject(item, "DoctorResponse.items[]");
    if (typeof finding.code !== "string")
      throw new Error("DoctorResponse: item missing code");
    if (typeof finding.severity !== "string")
      throw new Error("DoctorResponse: item missing severity");
    if (typeof finding.title !== "string")
      throw new Error("DoctorResponse: item missing title");
  }
}
