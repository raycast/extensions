import { BaseCorrector } from "./base-corrector";
import {
  FULL_WIDTH_CHARS,
  HALF_WIDTH_CHARS,
  ZH_CHARS_START,
  ZH_CHARS_END,
} from "../utils/constants";
import { Logger } from "../utils/logger";

export class CharacterCorrector extends BaseCorrector {
  handle(text: string): string {
    Logger.log("CharacterCorrector: Starting");

    let result = text;

    result = this.convertFullWidthToHalf(result);
    result = this.fixChinesePunctuation(result);
    result = this.removeDuplicatePunctuation(result);

    Logger.log("CharacterCorrector: Completed");
    return result;
  }

  private convertFullWidthToHalf(text: string): string {
    let result = text;

    for (let i = 0; i < FULL_WIDTH_CHARS.length; i++) {
      const fullWidth = FULL_WIDTH_CHARS[i];
      const halfWidth = HALF_WIDTH_CHARS[i];
      result = result.split(fullWidth).join(halfWidth);
    }

    return result;
  }

  private fixChinesePunctuation(text: string): string {
    const zhRange = `[${ZH_CHARS_START}-${ZH_CHARS_END}]`;
    const pattern = new RegExp(`(${zhRange})([,.:;?!])`, "g");

    const map: Record<string, string> = {
      ",": "，",
      ".": "。",
      ":": "：",
      ";": "；",
      "?": "？",
      "!": "！",
    };

    return text.replace(pattern, (_, chinese, punct) => {
      return chinese + (map[punct] || punct);
    });
  }

  private removeDuplicatePunctuation(text: string): string {
    return text.replace(/([！？])([！？]+)/g, "$1");
  }
}
