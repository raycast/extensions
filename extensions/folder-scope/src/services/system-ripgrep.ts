import type { SearchEngine } from "../types/search";
import { resolveSystemRipgrep } from "../utils/system-ripgrep";
import { RipgrepEngine } from "./ripgrep-engine";

export function createSystemRipgrepEngine(): SearchEngine {
  return new RipgrepEngine("system-ripgrep", resolveSystemRipgrep);
}
