import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import type { SlackMember } from "./slackTypes";
import { toUserName } from "./member";

const FRESH_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Snapshot = { savedAt: number; members: SlackMember[] };

const cache = new Cache({ capacity: 20 * 1024 * 1024 });
const memory = new Map<string, Snapshot>();
const inflight = new Map<string, Promise<SlackMember[]>>();

/** Keeps only fields used for search and for building User rows; drops deleted users and bots. */
export function slimMember(member: SlackMember): SlackMember | undefined {
  if (!toUserName(member)) return undefined;
  const { profile } = member;
  return {
    id: member.id,
    team_id: member.team_id,
    name: member.name,
    real_name: member.real_name,
    tz: member.tz,
    profile: profile && {
      real_name: profile.real_name,
      display_name: profile.display_name,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      image_24: profile.image_24,
      title: profile.title,
      status_text: profile.status_text,
      status_emoji: profile.status_emoji,
      status_expiration: profile.status_expiration,
    },
  };
}

function keyFor(token: string | undefined) {
  return `member-directory:${createHash("sha256")
    .update(token ?? "")
    .digest("hex")
    .slice(0, 16)}`;
}

function read(key: string): Snapshot | undefined {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = cache.get(key);
    if (!raw) return undefined;
    const snapshot = JSON.parse(raw) as Snapshot;
    memory.set(key, snapshot);
    return snapshot;
  } catch {
    return undefined;
  }
}

function write(key: string, members: SlackMember[]) {
  const snapshot = { savedAt: Date.now(), members };
  memory.set(key, snapshot);
  try {
    cache.set(key, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; the in-memory copy still serves this session.
  }
}

/** Returns the cached member list (even if stale) without triggering a load. */
export function peekMemberDirectory(token: string | undefined): SlackMember[] | undefined {
  const snapshot = read(keyFor(token));
  return snapshot && Date.now() - snapshot.savedAt < MAX_AGE_MS ? snapshot.members : undefined;
}

/**
 * Returns the workspace member list, scanning users.list at most once per hour (single-flight, shared by every
 * search). A stale snapshot is served immediately while a refresh runs in the background; if a refresh fails,
 * the stale snapshot keeps working.
 */
export async function getMemberDirectory(
  token: string | undefined,
  fetchAll: () => Promise<SlackMember[]>,
): Promise<SlackMember[]> {
  const key = keyFor(token);
  const snapshot = read(key);
  const age = snapshot ? Date.now() - snapshot.savedAt : Infinity;
  if (snapshot && age < FRESH_MS) return snapshot.members;

  let load = inflight.get(key);
  if (!load) {
    load = fetchAll()
      .then((members) => {
        write(key, members);
        return members;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, load);
  }

  if (snapshot && age < MAX_AGE_MS) {
    load.catch(() => undefined);
    return snapshot.members;
  }
  return load;
}
