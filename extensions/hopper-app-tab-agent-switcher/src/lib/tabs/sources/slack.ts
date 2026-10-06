// Slack desktop: the channels and DMs of every signed-in workspace (ADR-036). Slack keeps each workspace's state
// (Redux) in IndexedDB, as a blob file it rewrites when its window closes or the network drops: a new file, the old
// one deleted. So the newest blob per workspace is current as of then; channels joined since are missing until the
// next write. Only places are read (workspaces, channels, DMs, and DM members' names), never messages, and no
// unread counts: hours-old counts would be wrong.
//
// Selecting opens Slack's deep link (slack://channel, also for DMs), which switches workspace and opens the
// conversation in Slack's window (creating it if none is open). The open conversation is the one a window's title
// names: "<name> (Channel|DM|…) - <workspace> - Slack".

import type { App, BlobFields, Platform, Tab, TabSource } from "../model";
import { fromWindows } from "./windows";

const BUNDLE_ID = "com.tinyspeck.slackmacgap";
/** Slack's data folder: the direct download's, then the App Store build's. */
const DATA_DIRS = [
  "Library/Application Support/Slack",
  "Library/Containers/com.tinyspeck.slackmacgap/Data/Library/Application Support/Slack",
];
const BLOBS = "IndexedDB/https_app.slack.com_0.indexeddb.blob";
const FIELDS = ["selfTeamIds", "teams", "channels", "members"] as const;
/** ~140 KB per workspace here, mostly feature experiments; far above that means the state changed shape. */
const MAX_BLOB = 8 * 1024 * 1024;

interface Ref {
  team: string;
  id: string;
}

interface Channel {
  id?: unknown;
  name?: unknown;
  is_channel?: unknown;
  is_group?: unknown;
  is_im?: unknown;
  is_mpim?: unknown;
  is_archived?: unknown;
  is_member?: unknown;
  is_open?: unknown;
  /** A DM's other member. */
  user?: unknown;
}

interface Member {
  name?: unknown;
  real_name?: unknown;
  deleted?: unknown;
  profile?: { display_name?: unknown; real_name?: unknown };
}

/** One workspace's places, from its persisted state. */
export interface Workspace {
  id: string;
  name: string;
  modified: number;
  places: { id: string; title: string; dm: boolean }[];
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** How Slack names a person: display name, else real name, else username. */
export function memberName(member: Member | undefined): string {
  return (
    text(member?.profile?.display_name) ||
    text(member?.real_name) ||
    text(member?.profile?.real_name) ||
    text(member?.name)
  );
}

/** A group DM's name, "mpdm-ann--bob--cat-1", as its members' usernames: "ann, bob, cat". */
export function groupName(name: string): string {
  return name
    .replace(/^mpdm-/, "")
    .replace(/-\d+$/, "")
    .split("--")
    .join(", ");
}

/**
 * A workspace from one blob's fields; undefined for blobs that aren't a workspace's state. Channels and DMs the user
 * is in and hasn't archived or closed, channels by name, then DMs by name.
 */
export function parseWorkspace(blob: BlobFields): Workspace | undefined {
  const { selfTeamIds, teams, channels, members } = blob.fields as {
    selfTeamIds?: { teamId?: unknown };
    teams?: Record<string, { name?: unknown }>;
    channels?: Record<string, Channel>;
    members?: Record<string, Member>;
  };
  const id = text(selfTeamIds?.teamId);
  if (!id || !channels || typeof channels !== "object") return undefined;
  const places: Workspace["places"] = [];
  for (const channel of Object.values(channels)) {
    const channelId = text(channel?.id);
    const name = text(channel?.name);
    if (!channelId || channel.is_archived === true || channel.is_member === false) continue;
    if (channel.is_im === true) {
      if (channel.is_open === false) continue;
      const member = members?.[text(channel.user)];
      if (member?.deleted === true) continue;
      const title = memberName(member) || name;
      if (title) places.push({ id: channelId, title, dm: true });
    } else if (channel.is_mpim === true) {
      if (channel.is_open !== false && name) places.push({ id: channelId, title: groupName(name), dm: true });
    } else if ((channel.is_channel === true || channel.is_group === true) && name) {
      places.push({ id: channelId, title: `#${name}`, dm: false });
    }
  }
  places.sort((a, b) => Number(a.dm) - Number(b.dm) || a.title.localeCompare(b.title));
  return { id, name: text(teams?.[id]?.name), modified: blob.modified, places };
}

/** The newest state of each workspace (an old blob can outlive a write for a moment). */
export function latestWorkspaces(blobs: BlobFields[]): Workspace[] {
  const byId = new Map<string, Workspace>();
  for (const workspace of blobs.flatMap((b) => parseWorkspace(b) ?? [])) {
    const seen = byId.get(workspace.id);
    if (!seen || workspace.modified > seen.modified) byId.set(workspace.id, workspace);
  }
  return [...byId.values()];
}

/** The conversation a Slack window shows and its workspace, from "<name> (<kind>) - <workspace> - Slack". */
export function openConversation(windowTitle: string): { name: string; workspace: string } | undefined {
  const match = /^(.*) \([^()]+\) - (.*) - Slack$/.exec(windowTitle);
  return match ? { name: match[1], workspace: match[2] } : undefined;
}

/** Every workspace's places, workspaces with an open conversation first, then the most recently written. */
export function toTabs(app: App, workspaces: Workspace[], windowTitles: string[]): Tab<Ref>[] {
  const open = windowTitles.flatMap((title) => openConversation(title) ?? []);
  const isOpen = (workspace: Workspace, title: string) =>
    open.some((o) => o.workspace === workspace.name && (o.name === title || `#${o.name}` === title));
  const hasOpen = (workspace: Workspace) => workspace.places.some((p) => isOpen(workspace, p.title));
  const ordered = [...workspaces].sort((a, b) => Number(hasOpen(b)) - Number(hasOpen(a)) || b.modified - a.modified);
  return ordered.flatMap((workspace) =>
    workspace.places.map((place) => ({
      key: `${app.bundleId}:slack:${workspace.id}:${place.id}`,
      app,
      source: "slack",
      kind: "conversation" as const,
      title: place.title,
      detail: workspace.name || undefined,
      active: isOpen(workspace, place.title),
      ref: { team: workspace.id, id: place.id },
    })),
  );
}

/** The deep link opening a conversation (channel, private channel, DM, or group DM) in its workspace. */
export function conversationLink(ref: Ref): string {
  return `slack://channel?team=${encodeURIComponent(ref.team)}&id=${encodeURIComponent(ref.id)}`;
}

/**
 * Workspaces from the data folder written most recently. Both builds' folders can hold state (moved from the direct
 * download to the App Store build, or back): the other one is a stale install's, not merged in.
 */
async function readWorkspaces(platform: Platform): Promise<{ workspaces: Workspace[]; blobs: number }> {
  let best: Workspace[] = [];
  let blobs = 0;
  for (const dir of DATA_DIRS) {
    const read = await platform.readIndexedDbBlobs(`${platform.homeDir()}/${dir}/${BLOBS}`, FIELDS, MAX_BLOB);
    blobs += read.length;
    const workspaces = latestWorkspaces(read);
    if (newest(workspaces) > newest(best)) best = workspaces;
  }
  return { workspaces: best, blobs };
}

const newest = (workspaces: Workspace[]) => Math.max(0, ...workspaces.map((w) => w.modified));

export const slack: TabSource<Ref> = {
  id: "slack",
  bundleIds: [BUNDLE_ID],
  list: async (app, platform) => {
    const [all, { workspaces, blobs }] = await Promise.all([
      platform.windows([app.bundleId]),
      readWorkspaces(platform),
    ]);
    const appWindows = all.find((w) => w.bundleId === app.bundleId)?.windows ?? [];
    // Blobs, but none a workspace's state: Slack changed how it stores it (no blobs: signed out, or never used).
    if (blobs > 0 && workspaces.length === 0) platform.reportError(new Error("no workspace state"), "tabs: slack");
    if (workspaces.length === 0) return fromWindows(app, appWindows) as Tab[] as Tab<Ref>[];
    return toTabs(
      app,
      workspaces,
      appWindows.map((w) => w.title),
    );
  },
  select: async (tab, platform) => {
    await platform.openUrl(conversationLink(tab.ref));
  },
};
