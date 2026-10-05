/**
 * Read and write the synap CLI config at ~/.synap/config.json.
 *
 * This is the single source of truth for pod credentials shared across
 * all agent surfaces (Claude Code, Claude Desktop, Cursor, OpenClaw, Raycast).
 * `synap pods use <name>` in the terminal writes to this file; Raycast reads
 * and writes it directly — no CLI binary required at runtime.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface CliPodProfile {
  podUrl: string;
  hubApiKey: string;
  workspaceId?: string;
  agentUserId?: string;
  label?: string;
  savedAt?: string;
}

export type CliSurfaceName = "raycast" | "claude-code" | "claude-desktop" | "cursor" | "openclaw";

export interface CliSurfaceAgentKey {
  hubApiKey: string;
  agentUserId: string;
  /** Pod the key was provisioned against. Absent on keys saved by older CLI versions. */
  podUrl?: string;
}

export interface CliConfig {
  activePod: string;
  /** Per-surface pod overrides. Takes priority over activePod for the named surface. */
  surfaces?: Partial<Record<CliSurfaceName, string>>;
  pods: Record<string, CliPodProfile>;
  activeWorkspaceId?: string;
  /** Per-surface dedicated agent keys, separate from pod profile keys. */
  agentKeys?: Partial<Record<CliSurfaceName, CliSurfaceAgentKey>>;
}

const CONFIG_PATH = join(process.env.HOME ?? "/", ".synap", "config.json");

export function readCliConfig(): CliConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Partial<CliConfig>;
    if (!parsed.pods || typeof parsed.pods !== "object") return null;
    return {
      activePod: parsed.activePod ?? "",
      pods: parsed.pods,
      surfaces: parsed.surfaces,
      activeWorkspaceId: parsed.activeWorkspaceId,
      agentKeys: parsed.agentKeys,
    };
  } catch {
    return null;
  }
}

/** Fully resolved credentials for a surface, with every value pinned to ONE pod. */
export interface CliResolvedConnection {
  podName: string;
  podUrl: string;
  apiKey: string;
  /** 'agent' = dedicated surface agent key; 'pod' = the pod profile's own key. */
  keySource: "agent" | "pod";
  workspaceId?: string;
}

/**
 * Resolve the connection for a surface with pod affinity.
 *
 * Every credential must belong to the SAME pod the surface points at:
 * - The dedicated surface agent key is used only when it was provisioned against
 *   this pod (key.podUrl matches). Keys saved by older CLIs carry no podUrl —
 *   which pod they belong to is unknowable, so they are trusted only when the
 *   config has exactly ONE pod (unambiguous). Otherwise fall back to the pod
 *   profile's own key — always valid for its own pod.
 * - The global activeWorkspaceId override (written by `synap use`) belongs to the
 *   global activePod; it is applied only when this surface resolves to that pod.
 *   A surface pointed elsewhere uses that pod profile's own default workspace.
 */
export function resolveCliConnection(config: CliConfig, surface: CliSurfaceName): CliResolvedConnection | null {
  const podName = config.surfaces?.[surface] ?? config.activePod;
  const profile = podName ? config.pods[podName] : undefined;
  if (!podName || !profile?.podUrl || !profile?.hubApiKey) return null;

  const isGlobalActivePod = podName === config.activePod;

  const agentKey = config.agentKeys?.[surface];
  const agentKeyMatchesPod = agentKey?.podUrl
    ? agentKey.podUrl === profile.podUrl
    : Boolean(agentKey) && Object.keys(config.pods).length === 1;

  const workspaceId = isGlobalActivePod ? (config.activeWorkspaceId ?? profile.workspaceId) : profile.workspaceId;

  return {
    podName,
    podUrl: profile.podUrl,
    apiKey: agentKeyMatchesPod && agentKey ? agentKey.hubApiKey : profile.hubApiKey,
    keySource: agentKeyMatchesPod && agentKey ? "agent" : "pod",
    workspaceId,
  };
}

/** Get the pod profile name assigned to a surface (or global activePod). */
export function getCliSurfacePodName(config: CliConfig, surface: CliSurfaceName): string {
  return config.surfaces?.[surface] ?? config.activePod ?? "";
}

export function listCliProfiles(config: CliConfig): Array<{ name: string; profile: CliPodProfile; active: boolean }> {
  return Object.entries(config.pods).map(([name, profile]) => ({
    name,
    profile,
    active: name === config.activePod,
  }));
}

/**
 * Switch the pod for a specific surface only, without changing the global activePod.
 * Other surfaces are unaffected.
 *
 * Merge-write: reads the RAW file and touches only `surfaces`, preserving
 * top-level keys owned by other modules (`agents`, `agentWorkspaceRouting`, …) —
 * same discipline as the synap CLI's writeMultiConfig. Never write a
 * reconstructed CliConfig object back to disk; it would drop those keys.
 */
export function switchCliPodSurface(surface: CliSurfaceName, name: string): void {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    throw new Error("No synap CLI config found at ~/.synap/config.json");
  }
  const pods = raw.pods as Record<string, unknown> | undefined;
  if (!pods?.[name]) throw new Error(`Pod profile '${name}' not found`);
  const surfaces = { ...(raw.surfaces as Record<string, string> | undefined), [surface]: name };
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...raw, surfaces }, null, 2), {
    mode: 0o600,
  } as Parameters<typeof writeFileSync>[2]);
}
