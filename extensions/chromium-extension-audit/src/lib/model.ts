import { z } from "zod";

export const PermissionSetSchema = z.object({
  api: z.array(z.string()),
  hosts: z.array(z.string()),
  scripts: z.array(z.string()),
});
export type PermissionSet = z.infer<typeof PermissionSetSchema>;
export const AttentionSchema = z.enum(["Review now", "Review", "Informational"]);
export type Attention = z.infer<typeof AttentionSchema>;
export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["Capability", "Provenance"]),
  attention: AttentionSchema,
  explanation: z.string(),
  evidence: z.array(z.string()),
  confidence: z.enum(["Confirmed", "Partial"]),
  action: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;
export const AccessSchema = z.object({
  requested: PermissionSetSchema,
  optional: PermissionSetSchema,
  granted: PermissionSetSchema.nullable(),
  active: PermissionSetSchema.nullable(),
  runtime: PermissionSetSchema.nullable(),
  effective: PermissionSetSchema,
  withholding: z.boolean().nullable(),
  withheld: z.array(z.string()),
  conditional: z.array(z.string()),
  unknown: z.array(z.string()),
  complete: z.boolean(),
});
export type Access = z.infer<typeof AccessSchema>;
export const ContentScriptSchema = z.object({
  matches: z.array(z.string()),
  excludeMatches: z.array(z.string()),
  includeGlobs: z.array(z.string()),
  excludeGlobs: z.array(z.string()),
  js: z.array(z.string()),
  css: z.array(z.string()),
  allFrames: z.boolean(),
  matchAboutBlank: z.boolean(),
  matchOriginAsFallback: z.boolean(),
  runAt: z.string(),
  world: z.string(),
});
export const CodeSignalSchema = z.object({
  id: z.enum(["remote-code", "obfuscation", "dynamic-code", "encoded-payload"]),
  count: z.number(),
  files: z.array(z.string()),
});
export type CodeSignal = z.infer<typeof CodeSignalSchema>;
export const CodeAnalysisSchema = z.object({
  complete: z.boolean(),
  files: z.number(),
  bytes: z.number(),
  hash: z.string(),
  // Per-file hashes are kept on the latest observation and code reference; history drops them.
  fileHashes: z.record(z.string(), z.string()).optional(),
  hosts: z.array(z.string()),
  signals: z.array(CodeSignalSchema),
  limits: z.array(z.string()),
  skipped: z.array(z.string()).default([]),
});
export type CodeAnalysis = z.infer<typeof CodeAnalysisSchema>;
const CodeReferenceSchema = z.object({ version: z.string(), code: CodeAnalysisSchema });
export type CodeReference = z.infer<typeof CodeReferenceSchema>;
export const ExtensionSchema = z.object({
  key: z.string(),
  browser: z.string(),
  profile: z.string(),
  profileName: z.string(),
  id: z.string().regex(/^[a-p]{32}$/),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  manifestVersion: z.number(),
  icon: z.string().optional(),
  enabled: z.enum(["Enabled", "Disabled", "Unknown"]),
  disableReasons: z.array(z.number()),
  blocklisted: z.boolean(),
  // Optional: observations saved before these fields existed must not report existing values as changes.
  securityFlags: z.array(z.string()).optional(),
  settingsOverrides: z.array(z.string()).optional(),
  pageOverrides: z.array(z.string()).optional(),
  code: CodeAnalysisSchema.optional(),
  location: z.number().nullable(),
  provenance: z.enum([
    "Web Store",
    "Developer / unpacked",
    "External / sideloaded",
    "Policy-managed",
    "Browser component",
    "Unknown",
  ]),
  fromWebstore: z.boolean().nullable(),
  updateUrl: z.string(),
  installedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rawHash: z.string(),
  normalizedHash: z.string(),
  contentScriptsHash: z.string(),
  contentScripts: z.array(ContentScriptSchema).default([]),
  externalMatches: z.array(z.string()),
  contentScriptRestrictions: z.boolean(),
  access: AccessSchema,
  findings: z.array(FindingSchema),
  observedAt: z.string(),
  sources: z.array(z.string()),
  diagnostics: z.array(z.string()),
});
export type Extension = z.infer<typeof ExtensionSchema>;
export const ProfileSnapshotSchema = z.object({
  key: z.string(),
  browser: z.string(),
  id: z.string(),
  name: z.string(),
  observedAt: z.string(),
  extensions: z.array(ExtensionSchema),
  inventoryIds: z.array(z.string()).optional(),
  pendingInstallIds: z.array(z.string()).optional(),
  complete: z.boolean().optional(),
});
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;
export type ProfileScan = ProfileSnapshot & { complete: boolean; inventoryComplete?: boolean; diagnostics: string[] };
export type Scan = {
  at: string;
  profiles: ProfileScan[];
  diagnostics: string[];
  // Non-blocking context that does not make coverage incomplete.
  notices?: string[];
  discoveryComplete: boolean;
};
export const EventSchema = z.object({
  id: z.string(),
  extensionKey: z.string(),
  extensionId: z.string(),
  extensionName: z.string(),
  profileName: z.string(),
  profileKey: z.string(),
  type: z.string(),
  title: z.string(),
  attention: AttentionSchema,
  before: z.array(z.string()),
  after: z.array(z.string()),
  at: z.string(),
  reviewedAt: z.string().optional(),
});
export type ChangeEvent = z.infer<typeof EventSchema>;
export const StoreSchema = z.object({
  schema: z.literal(1),
  revision: z.number().int().nonnegative(),
  baselines: z.record(z.string(), ProfileSnapshotSchema),
  latest: z.record(z.string(), ProfileSnapshotSchema),
  accessReferences: z.record(z.string(), AccessSchema).optional(),
  codeReferences: z.record(z.string(), CodeReferenceSchema).optional(),
  snapshots: z.array(ProfileSnapshotSchema),
  events: z.array(EventSchema),
  lastAttempt: z.string().optional(),
  lastSuccess: z.string().optional(),
  diagnostics: z.array(z.string()),
  notices: z.array(z.string()).default([]),
  monitoringLastRun: z.string().optional(),
});
export type AuditStore = z.infer<typeof StoreSchema>;
export const emptyStore = (): AuditStore => ({
  schema: 1,
  revision: 0,
  baselines: {},
  latest: {},
  accessReferences: {},
  codeReferences: {},
  snapshots: [],
  events: [],
  diagnostics: [],
  notices: [],
});
export const emptyPermissions = (): PermissionSet => ({ api: [], hosts: [], scripts: [] });
export const unreviewed = (events: ChangeEvent[]) =>
  events.filter((e) => !e.reviewedAt && e.attention !== "Informational");
