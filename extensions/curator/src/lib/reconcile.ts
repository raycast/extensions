import { skillId } from "./parser";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "./types";

export async function reconcileIndex(args: {
  scanned: RawSkillEntry[];
  cached: SkillIndex | null;
  parse: (entry: RawSkillEntry) => Promise<ParsedSkill>;
}): Promise<SkillIndex> {
  const cachedById = new Map((args.cached?.skills ?? []).map((s) => [s.id, s]));
  const skills: ParsedSkill[] = [];

  for (const e of args.scanned) {
    const id = skillId(e.realPath);
    const prev = cachedById.get(id);
    const unchanged =
      prev &&
      e.fileMtime !== null &&
      prev.fileMtime === e.fileMtime &&
      !e.isBroken;
    if (unchanged) {
      skills.push(prev);
    } else {
      skills.push(await args.parse(e));
    }
  }

  return { scannedAt: Date.now(), skills };
}
