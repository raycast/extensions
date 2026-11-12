import { AlterEgoMap, Target } from "./types";

export function lookupTarget(map: AlterEgoMap, username: string | undefined | null): Target | undefined {
  if (!username || !username.trim()) {
    return undefined;
  }
  return map[username];
}
