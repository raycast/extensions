import type { Source, SourceId } from "../types";
import { bttv } from "./bttv";
import { ffz } from "./ffz";
import { seventv } from "./seventv";

export const SOURCES: Source[] = [seventv, bttv, ffz];

export const DEFAULT_SOURCE: SourceId = "7tv";

export function sourceById(id: string): Source {
  return SOURCES.find((s) => s.id === id) ?? seventv;
}
