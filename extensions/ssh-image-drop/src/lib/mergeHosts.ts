import { isValidHost } from "./validate";

export type HostSource = "recent" | "managed" | "config";

export interface HostEntry {
  name: string;
  source: HostSource;
}

export const RECENTS_CAP = 20;

export function mergeHosts(
  recents: string[],
  managed: string[],
  config: string[],
): HostEntry[] {
  const seen = new Set<string>();
  const out: HostEntry[] = [];
  const add = (names: string[], source: HostSource) => {
    for (const name of names) {
      // 스펙 §7: 모든 유입 경로(recents·managed·config)에 동일 검증 — ssh argv 오염 단일 차단 지점
      if (!name || seen.has(name) || !isValidHost(name)) continue;
      seen.add(name);
      out.push({ name, source });
    }
  };
  add(recents, "recent");
  add(managed, "managed");
  add(config, "config");
  return out;
}
