import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ChromeTabGroup, ChromeTabGroupColor, Profile } from "../types";

const colors: ChromeTabGroupColor[] = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
];
const sessionHeaderSize = 8;
const setTabGroupCommand = 25;
const setTabGroupMetadataCommand = 27;

function alignToFour(value: number) {
  return (value + 3) & ~3;
}

function groupAssignment(payload: Buffer) {
  if (payload.length !== 32) return;
  const tabId = payload.readInt32LE(0);
  if (tabId <= 0) return;
  return {
    tabId: String(tabId),
    groupId: payload[24] ? payload.subarray(8, 24).toString("hex") : undefined,
  };
}

function groupMetadata(payload: Buffer): ChromeTabGroup | undefined {
  if (payload.length < 28 || payload.readUInt32LE(0) > payload.length - 4)
    return;
  const titleLength = payload.readUInt32LE(20);
  const titleEnd = 24 + titleLength * 2;
  const colorOffset = alignToFour(titleEnd);
  if (titleEnd > payload.length || colorOffset + 4 > payload.length) return;
  const color = colors[payload.readUInt32LE(colorOffset)];
  if (!color) return;
  return {
    id: payload.subarray(4, 20).toString("hex"),
    title: payload.toString("utf16le", 24, titleEnd),
    color,
  };
}

/** 只读取 Chrome 当前明文会话中的标签组命令；未知格式直接退化为空。 */
export function parseTabGroups(buffer: Buffer): Map<string, ChromeTabGroup> {
  if (
    buffer.length < sessionHeaderSize ||
    buffer.toString("ascii", 0, 4) !== "SNSS" ||
    buffer.readUInt32LE(4) !== 3
  )
    return new Map();

  const assignments = new Map<string, string>();
  const groups = new Map<string, ChromeTabGroup>();
  let offset = sessionHeaderSize;
  while (offset + 3 <= buffer.length) {
    const size = buffer.readUInt16LE(offset);
    const end = offset + 2 + size;
    if (size < 1 || end > buffer.length) break;
    const command = buffer[offset + 2];
    const payload = buffer.subarray(offset + 3, end);
    if (command === setTabGroupCommand) {
      const assignment = groupAssignment(payload);
      if (assignment?.groupId)
        assignments.set(assignment.tabId, assignment.groupId);
      else if (assignment) assignments.delete(assignment.tabId);
    } else if (command === setTabGroupMetadataCommand) {
      const group = groupMetadata(payload);
      if (group) groups.set(group.id, group);
    }
    offset = end;
  }

  const result = new Map<string, ChromeTabGroup>();
  for (const [tabId, groupId] of assignments) {
    const group = groups.get(groupId);
    if (group) result.set(tabId, group);
  }
  return result;
}

async function latestSession(profile: Profile) {
  const directory = path.join(profile.path, "Sessions");
  const names = (await readdir(directory)).filter((name) =>
    name.startsWith("Session_"),
  );
  const files = await Promise.all(
    names.map(async (name) => {
      const file = path.join(directory, name);
      return { file, modified: (await stat(file)).mtimeMs };
    }),
  );
  return files.sort((a, b) => b.modified - a.modified)[0]?.file;
}

export async function readTabGroups(
  profiles: Profile[],
): Promise<Map<string, ChromeTabGroup>> {
  const profileGroups = await Promise.all(
    profiles.map(async (profile): Promise<Map<string, ChromeTabGroup>> => {
      try {
        const session = await latestSession(profile);
        return session
          ? parseTabGroups(await readFile(session))
          : new Map<string, ChromeTabGroup>();
      } catch {
        // 标签组只是补充信息，配置缺失或 Chrome 正在轮换会话时不影响标签搜索。
        return new Map<string, ChromeTabGroup>();
      }
    }),
  );
  const result = new Map<string, ChromeTabGroup>();
  for (const groups of profileGroups)
    for (const [tabId, group] of groups) result.set(tabId, group);
  return result;
}
