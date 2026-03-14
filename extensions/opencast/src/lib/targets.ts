import type { OpencodeTarget } from "./types";

export function targetKey(target: OpencodeTarget): string {
  return `${target.directory}::${target.workspace ?? ""}`;
}
