/**
 * Declarative spec that drives the interactive Config form. Each SECTION becomes
 * a card; its `fields` render as labelled controls in the section's edit sheet.
 * Hand-authored (not derived from the JSON schema) so labels, help text, grouping
 * and "advanced" collapsing read well for non-technical users — cross-checked
 * against `schemas/config.schema.json` (the Field Guide still documents the raw
 * schema). Mirrors `raycast/src/config-spec.ts`; keep the two in sync.
 */

export interface CfgField {
  key: string;
  label: string;
  type: "text" | "number" | "password" | "bool" | "select";
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Hidden under an "Advanced" disclosure by default. */
  advanced?: boolean;
  /** Secret: prefilled with the «redacted» sentinel; blank = keep existing. */
  secret?: boolean;
}

export interface CfgSection {
  id: string;
  title: string;
  icon: string;
  kind: "object" | "deviceMap" | "modules";
  /** Top-level config key holding this section's object; omit for root-level fields. */
  path?: string;
  /** Active/deactivate control for the whole section. */
  enable?: {
    /** Boolean field toggled on the section object (e.g. `enabled`, `keepAlive`). */
    key?: string;
    /** True when the section is active by mere presence of the block (e.g. `s3`). */
    presence?: boolean;
    label?: string;
  };
  fields: CfgField[];
  /** One-line description shown under the card title. */
  blurb?: string;
}

export const DEVICE_FIELDS: CfgField[] = [
  {
    key: "host",
    label: "Host / IP",
    type: "text",
    placeholder: "192.168.88.1",
    help: "SSH host. Ignored when a MAC address is set (MAC-Telnet).",
  },
  { key: "port", label: "SSH port", type: "number", placeholder: "22" },
  { key: "username", label: "Username", type: "text", placeholder: "admin" },
  { key: "password", label: "Password", type: "password", secret: true },
  {
    key: "timeoutMs",
    label: "Timeout (ms)",
    type: "number",
    placeholder: "10000",
  },
  {
    key: "description",
    label: "Description",
    type: "text",
    placeholder: "Core router",
    help: "Free-text label.",
  },
  {
    key: "keyFilename",
    label: "SSH key file",
    type: "text",
    advanced: true,
    help: "Path to a private-key file.",
  },
  {
    key: "privateKey",
    label: "Private key (PEM)",
    type: "password",
    secret: true,
    advanced: true,
  },
  {
    key: "keyPassphrase",
    label: "Key passphrase",
    type: "password",
    secret: true,
    advanced: true,
  },
  {
    key: "jumpVia",
    label: "Jump via device",
    type: "text",
    advanced: true,
    help: "Name of another device to use as an SSH bastion.",
  },
  {
    key: "mac",
    label: "MAC address",
    type: "text",
    advanced: true,
    help: "Set to reach the device over Layer-2 MAC-Telnet (no IP).",
  },
  { key: "sourceMac", label: "Source MAC", type: "text", advanced: true },
  {
    key: "macHost",
    label: "MAC-Telnet host iface",
    type: "text",
    advanced: true,
  },
  {
    key: "macPort",
    label: "MAC-Telnet port",
    type: "number",
    advanced: true,
    placeholder: "20561",
  },
];

export const CONFIG_SECTIONS: CfgSection[] = [
  {
    id: "devices",
    title: "Devices",
    icon: "🖧",
    kind: "deviceMap",
    blurb:
      "MikroTik routers this server manages. Toggle a device off to hide it from the tools.",
    fields: DEVICE_FIELDS,
  },
  {
    id: "mcp",
    title: "MCP Server",
    icon: "⚙️",
    kind: "object",
    path: "mcp",
    blurb: "How the MCP server is exposed to the AI client.",
    fields: [
      {
        key: "transport",
        label: "Transport",
        type: "select",
        options: ["stdio", "sse", "streamable-http"],
      },
      { key: "host", label: "Bind host", type: "text", placeholder: "0.0.0.0" },
      { key: "port", label: "Bind port", type: "number", placeholder: "8000" },
      {
        key: "appViews",
        label: "MCP App Views",
        type: "bool",
        help: "Expose rich App-view metadata to compatible clients.",
      },
      {
        key: "toolPageSize",
        label: "Tool page size",
        type: "number",
        advanced: true,
        help: "0 = no paging.",
      },
      {
        key: "allowedHosts",
        label: "Allowed hosts",
        type: "text",
        advanced: true,
        help: "Comma-separated.",
      },
      {
        key: "allowedOrigins",
        label: "Allowed origins",
        type: "text",
        advanced: true,
      },
      {
        key: "corsOrigins",
        label: "CORS origins",
        type: "text",
        advanced: true,
      },
    ],
  },
  {
    id: "dashboard",
    title: "Observability Dashboard",
    icon: "📊",
    kind: "object",
    path: "dashboard",
    enable: { key: "enabled", label: "Dashboard" },
    blurb:
      "This web dashboard — records every tool call and serves the live UI.",
    fields: [
      { key: "host", label: "Bind host", type: "text", placeholder: "0.0.0.0" },
      { key: "port", label: "Bind port", type: "number", placeholder: "9090" },
      {
        key: "token",
        label: "Access token",
        type: "password",
        secret: true,
        help: "Require this bearer token to view the dashboard.",
      },
      { key: "captureBody", label: "Capture tool input/output", type: "bool" },
      { key: "redactInput", label: "Redact input bodies", type: "bool" },
      { key: "dbPath", label: "Database path", type: "text", advanced: true },
      {
        key: "maxEvents",
        label: "Max events kept",
        type: "number",
        advanced: true,
      },
      {
        key: "maxBodyBytes",
        label: "Max body bytes",
        type: "number",
        advanced: true,
      },
    ],
  },
  {
    id: "ssh",
    title: "SSH Connection Pool",
    icon: "🔌",
    kind: "object",
    path: "ssh",
    enable: { key: "keepAlive", label: "Keep-alive pooling" },
    blurb: "Reuse SSH connections across tool calls for lower latency.",
    fields: [
      {
        key: "keepAliveInterval",
        label: "Keep-alive interval (ms)",
        type: "number",
        placeholder: "10000",
      },
      {
        key: "idleTimeout",
        label: "Idle timeout (ms)",
        type: "number",
        placeholder: "30000",
      },
    ],
  },
  {
    id: "s3",
    title: "S3 Backups",
    icon: "☁️",
    kind: "object",
    path: "s3",
    enable: { presence: true, label: "S3 backups" },
    blurb: "Ship config backups to an S3-compatible bucket.",
    fields: [
      { key: "bucket", label: "Bucket", type: "text" },
      { key: "region", label: "Region", type: "text" },
      {
        key: "endpoint",
        label: "Endpoint",
        type: "text",
        placeholder: "https://s3.example.com",
      },
      {
        key: "accessKeyId",
        label: "Access key ID",
        type: "password",
        secret: true,
      },
      {
        key: "secretAccessKey",
        label: "Secret access key",
        type: "password",
        secret: true,
      },
      { key: "prefix", label: "Key prefix", type: "text" },
      {
        key: "sessionToken",
        label: "Session token",
        type: "password",
        secret: true,
        advanced: true,
      },
      {
        key: "presignExpiresIn",
        label: "Presign expiry (s)",
        type: "number",
        advanced: true,
        placeholder: "3600",
      },
    ],
  },
  {
    id: "memory",
    title: "Knowledge Memory",
    icon: "🧠",
    kind: "object",
    path: "memory",
    enable: { key: "enabled", label: "Memory" },
    blurb: "Persistent knowledge graph the AI can read and write.",
    fields: [{ key: "dbPath", label: "Database path", type: "text" }],
  },
  {
    id: "modules",
    title: "Tool Modules",
    icon: "🧩",
    kind: "modules",
    blurb: "Curate which tool modules are exposed to the AI client.",
    fields: [],
  },
  {
    id: "general",
    title: "General",
    icon: "🎛️",
    kind: "object",
    // Root-level fields (no `path`).
    blurb: "Server-wide options.",
    fields: [
      {
        key: "readOnly",
        label: "Read-only mode",
        type: "bool",
        help: "Block all write/destructive tools.",
      },
      {
        key: "disableUpdateCheck",
        label: "Disable update check",
        type: "bool",
      },
      {
        key: "backupDir",
        label: "Backup directory",
        type: "text",
        advanced: true,
      },
    ],
  },
];
