/**
 * Windows Discord path resolution and launch helpers
 *
 * Default install locations (per %LOCALAPPDATA%):
 *  - Stable: %LocalAppData%/Discord/Update.exe --processStart Discord.exe
 *  - PTB:    %LocalAppData%/DiscordPTB/Update.exe --processStart DiscordPTB.exe
 *  - Canary: %LocalAppData%/DiscordCanary/Update.exe --processStart DiscordCanary.exe
 *
 * Fallback: If Update.exe is missing, try launching Discord.exe directly in the same folder.
 * All launches are detached and non-blocking.
 */

import { Toast, showToast } from "@raycast/api";
import { spawn } from "child_process";
import { access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";
import type { InstallFlavor, Preferences } from "../types";

export function normalizePath(p: string): string {
  // Normalize Windows paths and trim quotes/spaces
  return path.normalize(p.replace(/^"|"$/g, "").trim());
}

function getLocalAppData(): string | undefined {
  return process.env.LOCALAPPDATA || process.env.localappdata;
}

async function fileExists(p?: string): Promise<boolean> {
  if (!p) return false;
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

export async function resolveDiscordPaths(
  preferences: Preferences,
): Promise<{ stable?: string; ptb?: string; canary?: string }> {
  const lad = getLocalAppData();

  const stableDefaultUpdate = lad ? path.join(lad, "Discord", "Update.exe") : undefined;
  const ptbDefaultUpdate = lad ? path.join(lad, "DiscordPTB", "Update.exe") : undefined;
  const canaryDefaultUpdate = lad ? path.join(lad, "DiscordCanary", "Update.exe") : undefined;

  const stableOverride = preferences.stablePath ? normalizePath(preferences.stablePath) : undefined;
  const ptbOverride = preferences.ptbPath ? normalizePath(preferences.ptbPath) : undefined;
  const canaryOverride = preferences.canaryPath ? normalizePath(preferences.canaryPath) : undefined;

  // Prefer overrides; otherwise default Update.exe; if not exists, try Discord.exe within same root
  const resolve = async (override: string | undefined, defUpdate: string | undefined, exeName: string) => {
    const candidate = override || defUpdate;
    if (await fileExists(candidate)) return candidate!;

    // try fallback to Discord.exe in the same folder
    const root = candidate ? path.dirname(candidate) : undefined;
    const fallback = root ? path.join(root, exeName) : undefined;
    if (await fileExists(fallback)) return fallback!;
    return undefined;
  };

  return {
    stable: await resolve(stableOverride, stableDefaultUpdate, "Discord.exe"),
    ptb: await resolve(ptbOverride, ptbDefaultUpdate, "DiscordPTB.exe"),
    canary: await resolve(canaryOverride, canaryDefaultUpdate, "DiscordCanary.exe"),
  };
}

function flavorMeta(flavor: InstallFlavor): { updateExe: string; processName: string } {
  switch (flavor) {
    case "ptb":
      return { updateExe: "Update.exe", processName: "DiscordPTB.exe" };
    case "canary":
      return { updateExe: "Update.exe", processName: "DiscordCanary.exe" };
    case "stable":
    default:
      return { updateExe: "Update.exe", processName: "Discord.exe" };
  }
}

export async function openDiscord(flavor?: InstallFlavor, overridePath?: string): Promise<void> {
  const targetFlavor = flavor || "stable";
  const { processName } = flavorMeta(targetFlavor);

  // The UI passes overridePath when it has a resolved path; if not, try resolve from env
  let exePath = overridePath ? normalizePath(overridePath) : undefined;
  if (!exePath) {
    const resolved = await resolveDiscordPaths({ preferredFlavor: targetFlavor });
    exePath = resolved[targetFlavor];
  }

  if (!exePath) {
    await showToast(Toast.Style.Failure, "Discord not found", `Could not resolve ${targetFlavor} install`);
    return;
  }

  // If we're launching Update.exe, pass --processStart <Discord*.exe>, otherwise spawn the exe directly
  const isUpdate = path.basename(exePath).toLowerCase() === "update.exe";
  const args = isUpdate ? ["--processStart", processName] : [];

  try {
    const child = spawn(exePath, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await showToast(Toast.Style.Failure, "Failed to launch Discord", msg);
  }
}

export async function openDeepLink(url: string): Promise<void> {
  // We use Raycast API open to hand off to the OS registered protocol handler
  const { open } = await import("@raycast/api");
  try {
    await open(url);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await showToast(Toast.Style.Failure, "Failed to open link", msg);
  }
}

export function getSettingsLink(): string {
  return "discord://-/settings";
}

export function getKeybindsLink(): string {
  return "discord://-/settings/keybinds";
}

export function makeServerLink(guildId: string): string {
  return `discord://-/channels/${guildId}`;
}

export function makeChannelLink(guildId: string, channelId: string): string {
  return `discord://-/channels/${guildId}/${channelId}`;
}

export function makeDmLink(channelId: string): string {
  return `discord://-/channels/@me/${channelId}`;
}

export function isDiscordDeepLink(url: string): boolean {
  return /^discord:\/\//i.test(url.trim());
}

/**
 * Parse a single input string and attempt to build a discord:// deep link.
 * Supported inputs (examples):
 * - Full deep link: discord://-/channels/123/456[/789]
 * - Web URL: https://discord.com/channels/123/456[/789] or .../@me/456[/789]
 * - Triplet IDs: 123/456/789 or 123 456 789 or 123,456,789 (guild/channel/message)
 * - Pair IDs: 123/456 (guild/channel)
 * - DM pair: @me/456[/789] or dm:456[/789]
 * - Single ID: assume DM channel open (channels/@me/<id>)
 * - Prefixed hints: server:123, channel:123/456, dm:456[/789]
 */
export function parseDiscordInput(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;

  // Already a deep link
  if (isDiscordDeepLink(raw)) return raw;

  // Web URL
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      const parts = u.pathname.split("/").filter(Boolean); // e.g., channels, <guild|@me>, <channel>, [message]
      const chIdx = parts.findIndex((p) => p.toLowerCase() === "channels");
      if (chIdx >= 0) {
        const a = parts[chIdx + 1];
        const b = parts[chIdx + 2];
        const c = parts[chIdx + 3];
        if (a && b && c) {
          // guild or @me / channel / message
          if (a.toLowerCase() === "@me") return makeDmMessageLink(b, c);
          return makeGuildMessageLink(a, b, c);
        } else if (a && b) {
          if (a.toLowerCase() === "@me") return makeDmLink(b);
          return makeChannelLink(a, b);
        }
      }
    }
  } catch {
    // ignore URL parse errors; we'll fall through to other parsing strategies
  }

  // Prefix hints
  const lower = raw.toLowerCase();
  if (lower.startsWith("dm:")) {
    const rest = raw.slice(3).trim();
    const [ch, msg] = splitIds(rest);
    if (ch && msg) return makeDmMessageLink(ch, msg);
    if (ch) return makeDmLink(ch);
  }
  if (lower.startsWith("server:")) {
    const guild = raw.slice(7).trim();
    if (guild) return makeServerLink(guild);
  }
  if (lower.startsWith("channel:")) {
    const rest = raw.slice(8).trim();
    const [g, c, m] = splitIds(rest);
    if (g && c && m) return makeGuildMessageLink(g, c, m);
    if (g && c) return makeChannelLink(g, c);
  }

  // @me path notation
  if (lower.startsWith("@me/")) {
    const rest = raw.slice(4);
    const [ch, msg] = splitIds(rest);
    if (ch && msg) return makeDmMessageLink(ch, msg);
    if (ch) return makeDmLink(ch);
  }

  // Triplet / pair / single IDs separated by / , space, or ,
  const ids = raw.split(/[\s,/]+/).filter(Boolean);
  if (ids.length >= 3) {
    const [g, c, m] = ids;
    return makeGuildMessageLink(g, c, m);
  }
  if (ids.length === 2) {
    const [a, b] = ids;
    // Without @me hint we assume guild/channel
    return makeChannelLink(a, b);
  }
  if (ids.length === 1) {
    // Assume DM channel id
    return makeDmLink(ids[0]);
  }

  return undefined;
}

function splitIds(s: string): string[] {
  return s.split(/[\s,/]+/).filter(Boolean);
}

export function makeGuildMessageLink(guildId: string, channelId: string, messageId: string): string {
  return `discord://-/channels/${guildId}/${channelId}/${messageId}`;
}

export function makeDmMessageLink(channelId: string, messageId: string): string {
  return `discord://-/channels/@me/${channelId}/${messageId}`;
}

export type SettingsSubsection =
  | "general"
  | "keybinds"
  | "voice"
  | "notifications"
  | "appearance"
  | "accessibility"
  | "privacy"
  | "advanced";

export function getSettingsSubLink(section: SettingsSubsection): string {
  switch (section) {
    case "keybinds":
      return "discord://-/settings/keybinds";
    case "voice":
      return "discord://-/settings/voice";
    case "notifications":
      return "discord://-/settings/notifications";
    case "appearance":
      return "discord://-/settings/appearance";
    case "accessibility":
      return "discord://-/settings/accessibility";
    case "privacy":
      return "discord://-/settings/privacy";
    case "advanced":
      return "discord://-/settings/advanced";
    case "general":
    default:
      return "discord://-/settings";
  }
}
