import { BaseCorrector } from "./base-corrector";
import { SPACE_PATTERNS, REMOVE_SPACE_PATTERNS } from "../utils/regex-patterns";
import { Logger } from "../utils/logger";

export class SpaceCorrector extends BaseCorrector {
  handle(text: string): string {
    Logger.log("SpaceCorrector: Starting");

    let result = text;

    for (const pattern of SPACE_PATTERNS) {
      const before = result;
      result = result.replace(pattern.pattern, pattern.replacement);

      if (before !== result) {
        Logger.log(`SpaceCorrector: Applied ${pattern.name}`);
      }
    }

    for (const pattern of REMOVE_SPACE_PATTERNS) {
      const before = result;
      result = result.replace(pattern.pattern, pattern.replacement);

      if (before !== result) {
        Logger.log(`SpaceCorrector: Applied ${pattern.name}`);
      }
    }

    Logger.log("SpaceCorrector: Completed");
    return result;
  }
}
