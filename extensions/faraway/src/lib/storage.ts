import { LocalStorage, environment } from "@raycast/api";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { writeCircularAvatar } from "./image";

const STORAGE_KEY = "faraway.friends.v1";

export type Friend = {
  id: string;
  name: string;
  timezone: string;
  cityLabel: string;
  avatarPath?: string;
  createdAt: number;
};

export type FriendInput = {
  name: string;
  timezone: string;
  cityLabel: string;
  /** Local source path of an image to copy. If undefined and editing, keeps existing. */
  avatarSourcePath?: string;
  /** Set true on edit to clear the avatar without providing a new one. */
  clearAvatar?: boolean;
};

async function avatarsDir(): Promise<string> {
  const dir = path.join(environment.supportPath, "avatars");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function listFriends(): Promise<Friend[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Friend[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(friends: Friend[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

async function copyAvatar(srcPath: string, friendId: string): Promise<string> {
  const dir = await avatarsDir();
  // We always store the processed avatar as PNG (transparent corners require alpha).
  const destPath = path.join(dir, `${friendId}.png`);
  // Remove any previous avatar files for this friend (different extensions).
  try {
    const existing = await fs.readdir(dir);
    await Promise.all(
      existing
        .filter((f) => f.startsWith(`${friendId}.`) && f !== path.basename(destPath))
        .map((f) => fs.unlink(path.join(dir, f)).catch(() => undefined)),
    );
  } catch {
    // ignore
  }
  await writeCircularAvatar(srcPath, destPath);
  return destPath;
}

async function deleteAvatar(avatarPath?: string): Promise<void> {
  if (!avatarPath) return;
  try {
    await fs.unlink(avatarPath);
  } catch {
    // best-effort
  }
}

export async function createFriend(input: FriendInput): Promise<Friend> {
  const friends = await listFriends();
  const id = crypto.randomUUID();
  let avatarPath: string | undefined;
  if (input.avatarSourcePath) {
    avatarPath = await copyAvatar(input.avatarSourcePath, id);
  }
  const friend: Friend = {
    id,
    name: input.name.trim(),
    timezone: input.timezone,
    cityLabel: input.cityLabel,
    avatarPath,
    createdAt: Date.now(),
  };
  friends.push(friend);
  await writeAll(friends);
  return friend;
}

export async function updateFriend(id: string, input: FriendInput): Promise<Friend> {
  const friends = await listFriends();
  const idx = friends.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error(`Friend ${id} not found`);
  const current = friends[idx];

  let avatarPath = current.avatarPath;
  if (input.avatarSourcePath) {
    avatarPath = await copyAvatar(input.avatarSourcePath, id);
  } else if (input.clearAvatar) {
    await deleteAvatar(current.avatarPath);
    avatarPath = undefined;
  }

  const updated: Friend = {
    ...current,
    name: input.name.trim(),
    timezone: input.timezone,
    cityLabel: input.cityLabel,
    avatarPath,
  };
  friends[idx] = updated;
  await writeAll(friends);
  return updated;
}

export async function deleteFriend(id: string): Promise<void> {
  const friends = await listFriends();
  const friend = friends.find((f) => f.id === id);
  const next = friends.filter((f) => f.id !== id);
  await writeAll(next);
  await deleteAvatar(friend?.avatarPath);
}
