// Types pinned against live `yerd --json` output captured on 2026-07-29
// (daemon_version 2.0.4).
// Every response carries a `type` discriminator EXCEPT `lan status`.

// ---------------------------------------------------------------------------
// ping
// ---------------------------------------------------------------------------

/** `yerd --json ping` */
export interface PingResponse {
  type: "pong";
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

export interface PortBinding {
  requested: number;
  bound: number;
  fell_back: boolean;
}

export interface CaStatus {
  path: string;
  fingerprint: string;
  trusted_system: boolean;
  php_trusts_ca: boolean;
  /** e.g. "tool_missing" */
  browser_trust: string;
}

export interface PhpFpmStatus {
  version: string;
  installed_patch: string;
  /** "running" observed; other states assumed for stopped pools */
  state: string;
  // pid/listen/rss_bytes observed non-null for running pools; null assumed when stopped
  pid: number | null;
  listen: string | null;
  rss_bytes: number | null;
  update_available: string | null;
}

export interface SiteCounts {
  parked: number;
  linked: number;
  secured: number;
}

export interface MailStatus {
  enabled: boolean;
  port: number;
  listening: boolean;
  count: number;
  unread: number;
}

export interface PortRedirectTargets {
  http: number;
  https: number;
}

export interface YerdStatusReport {
  daemon_pid: number;
  uptime_secs: number;
  daemon_rss_bytes: number;
  tld: string;
  http: PortBinding;
  https: PortBinding;
  dns_addr: string;
  ca: CaStatus;
  resolver_installed: boolean;
  port_redirect: boolean;
  foreign_web_listener: boolean;
  // observed string; null assumed when no resolver backup exists
  resolver_backup: string | null;
  default_php: string;
  php: PhpFpmStatus[];
  sites: SiteCounts;
  // observed null only; non-null shape unverified
  load_avg: unknown;
  daemon_version: string;
  services: YerdService[];
  mail: MailStatus;
  boot_id: number;
  symlink_protection: boolean;
  mcp_enabled: boolean;
  lan_enabled: boolean;
  port_redirect_targets: PortRedirectTargets;
}

/** `yerd --json status` — the report is nested, not flat */
export interface StatusResponse {
  type: "status";
  report: YerdStatusReport;
}

// ---------------------------------------------------------------------------
// sites
// ---------------------------------------------------------------------------

export interface YerdSite {
  name: string;
  document_root: string;
  php: string;
  secure: boolean;
  kind: "parked" | "linked";
  uses_front_controller: boolean;
  /** present only when the site serves from a subdirectory, e.g. "public" */
  web_subpath?: string;
  is_laravel?: boolean;
  is_wordpress?: boolean;
}

/** `yerd --json sites` */
export interface SitesResponse {
  type: "sites";
  sites: YerdSite[];
}

// ---------------------------------------------------------------------------
// php
// ---------------------------------------------------------------------------

/** `yerd --json list php` */
export interface PhpVersionsResponse {
  type: "php_versions";
  installed: string[];
  default: string;
  /** ini overrides, e.g. { memory_limit: "512M" } */
  settings: Record<string, string>;
}

/** `yerd --json list php --available` */
export interface PhpAvailableResponse {
  type: "available_php";
  available: string[];
  installed: string[];
  legacy: string[];
}

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------

export interface YerdService {
  service: string;
  display_name: string;
  installed_versions: string[];
  selected_version: string | null;
  /** "running" | "stopped" observed */
  state: string;
  pid: number | null;
  listen: string | null;
  port: number;
  enabled: boolean;
  supports_databases: boolean;
  type_id: string;
}

/** `yerd --json services` */
export interface ServicesResponse {
  type: "services";
  services: YerdService[];
}

export interface AvailableService {
  service: string;
  available: string[];
  installed: string[];
}

/** `yerd --json service available` */
export interface ServiceAvailableResponse {
  type: "available_services";
  services: AvailableService[];
}

// ---------------------------------------------------------------------------
// proxies
// ---------------------------------------------------------------------------

/** whole-host proxy: <name>.test → target */
export interface YerdProxy {
  name: string;
  target: string;
  secure: boolean;
}

/** per-site path rule: <site>.test<prefix> → target */
export interface YerdProxyRule {
  site: string;
  prefix: string;
  target: string;
}

/** `yerd --json proxy list` */
export interface ProxiesResponse {
  type: "proxies";
  proxies: YerdProxy[];
  rules: YerdProxyRule[];
}

// ---------------------------------------------------------------------------
// mail
// ---------------------------------------------------------------------------

/** list entry — bodies are only available via `mail show <id>` */
export interface MailSummary {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date_epoch: number;
  read: boolean;
}

/** `yerd --json mail list` */
export interface MailListResponse {
  type: "mails";
  mails: MailSummary[];
}

export interface MailHeader {
  name: string;
  value: string;
}

export interface MailDetail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date_epoch: number;
  headers: MailHeader[];
  html_body: string | null;
  text_body: string | null;
}

/** `yerd --json mail show <id>` */
export interface MailShowResponse {
  type: "mail";
  mail: MailDetail;
}

// ---------------------------------------------------------------------------
// tunnel
// ---------------------------------------------------------------------------

export interface CloudflaredStatus {
  installed: boolean;
  // observed "2026.7.3" / "managed" while installed; null assumed when not installed
  version: string | null;
  source: string | null;
  logged_in: boolean;
}

/** `yerd --json tunnel status` */
export interface TunnelStatusResponse {
  type: "tunnels";
  // observed empty only (cloudflared not logged in); element shape unverified
  tunnels: unknown[];
  cloudflared: CloudflaredStatus;
}

// ---------------------------------------------------------------------------
// lan
// ---------------------------------------------------------------------------

/** `yerd --json lan status` — NOTE: no `type` discriminator on this one */
export interface LanStatusResponse {
  lan_enabled: boolean;
  // observed null only (LAN disabled); string IP assumed when enabled
  lan_ip: string | null;
  // observed null only; non-null shape unverified
  lan_setup_bound: unknown;
}

// ---------------------------------------------------------------------------
// tools
// ---------------------------------------------------------------------------

export interface YerdTool {
  id: string;
  display_name: string;
  installed: boolean;
  // observed string for installed tools (e.g. "2.10.2", "installed"); null assumed otherwise
  version: string | null;
  binaries: string[];
}

/** `yerd --json tools` */
export interface ToolsResponse {
  type: "tools";
  tools: YerdTool[];
}

// ---------------------------------------------------------------------------
// db
// ---------------------------------------------------------------------------

export interface YerdDatabase {
  name: string;
}

// shape verified for mysql only; mariadb/postgres assumed identical
// — re-verify when installed (consumed defensively in todo 8)
/** `yerd --json db list <service>` */
export interface DbListResponse {
  type: "databases";
  databases: YerdDatabase[];
}

// ---------------------------------------------------------------------------
// doctor
// ---------------------------------------------------------------------------

export interface DoctorItem {
  code: string;
  /** "ok" | "warn" observed; error-level severities assumed to exist */
  severity: string;
  title: string;
  detail: string;
  remedy: string | null;
}

/** `yerd --json doctor` */
export interface DoctorResponse {
  type: "diagnoses";
  items: DoctorItem[];
}
