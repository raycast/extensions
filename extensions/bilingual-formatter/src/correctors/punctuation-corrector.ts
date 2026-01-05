import { BaseCorrector } from "./base-corrector";
import { isZhChar, isEnChar } from "../utils/character-types";
import { CHINESE_PUNCTUATION, ENGLISH_PUNCTUATION } from "../utils/constants";
import { Logger } from "../utils/logger";

export class PunctuationCorrector extends BaseCorrector {
  handle(text: string): string {
    Logger.log("PunctuationCorrector: Starting");

    let result = text;

    result = this.convertEllipsis(result);
    result = this.fixBrackets(result);

    Logger.log("PunctuationCorrector: Completed");
    return result;
  }

  private convertEllipsis(text: string): string {
    return text.replace(/(\.{2,}|。{2,}|…)/g, CHINESE_PUNCTUATION.ELLIPSIS);
  }

  private fixBrackets(text: string): string {
    const result = text.split("");

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (char === "(") {
        if (this.detectForward(isZhChar, result, i)) {
          result[i] = CHINESE_PUNCTUATION.LEFT_BRACKET;
          this.matchRightBracket(
            result,
            i + 1,
            CHINESE_PUNCTUATION.LEFT_BRACKET,
            CHINESE_PUNCTUATION.RIGHT_BRACKET,
          );
        }
      } else if (char === ")") {
        if (this.detectBackward(isZhChar, result, i)) {
          result[i] = CHINESE_PUNCTUATION.RIGHT_BRACKET;
          this.matchLeftBracket(
            result,
            i - 1,
            CHINESE_PUNCTUATION.LEFT_BRACKET,
            CHINESE_PUNCTUATION.RIGHT_BRACKET,
          );
        }
      } else if (char === CHINESE_PUNCTUATION.LEFT_BRACKET) {
        if (this.detectForward(isEnChar, result, i)) {
          result[i] = ENGLISH_PUNCTUATION.LEFT_BRACKET;
          this.matchRightBracket(
            result,
            i + 1,
            ENGLISH_PUNCTUATION.LEFT_BRACKET,
            ENGLISH_PUNCTUATION.RIGHT_BRACKET,
          );
        }
      } else if (char === CHINESE_PUNCTUATION.RIGHT_BRACKET) {
        if (this.detectBackward(isEnChar, result, i)) {
          result[i] = ENGLISH_PUNCTUATION.RIGHT_BRACKET;
          this.matchLeftBracket(
            result,
            i - 1,
            ENGLISH_PUNCTUATION.LEFT_BRACKET,
            ENGLISH_PUNCTUATION.RIGHT_BRACKET,
          );
        }
      }
    }

    return result.join("");
  }

  private detectForward(
    checkFn: (c: string) => boolean,
    chars: string[],
    i: number,
  ): boolean {
    if (i === 0) return false;
    if (checkFn(chars[i - 1])) return true;
    if (chars[i - 1].trim() !== "") return false;
    if (i === 1) return false;
    if (checkFn(chars[i - 2])) return true;
    return false;
  }

  private detectBackward(
    checkFn: (c: string) => boolean,
    chars: string[],
    i: number,
  ): boolean {
    if (i === chars.length - 1) return false;
    if (checkFn(chars[i + 1])) return true;
    if (chars[i + 1].trim() !== "") return false;
    if (i === chars.length - 2) return false;
    if (checkFn(chars[i + 2])) return true;
    return false;
  }

  private matchRightBracket(
    chars: string[],
    start: number,
    left: string,
    right: string,
  ): void {
    let bracketCount = 0;
    for (let j = start; j < chars.length; j++) {
      if (chars[j] === right || chars[j] === ")") {
        if (bracketCount === 0) {
          chars[j] = right;
          break;
        } else {
          bracketCount--;
        }
      } else if (chars[j] === left || chars[j] === "(") {
        bracketCount++;
      }
    }
  }

  private matchLeftBracket(
    chars: string[],
    start: number,
    left: string,
    right: string,
  ): void {
    let bracketCount = 0;
    for (let j = start; j >= 0; j--) {
      if (chars[j] === left || chars[j] === "(") {
        if (bracketCount === 0) {
          chars[j] = left;
          break;
        } else {
          bracketCount--;
        }
      } else if (chars[j] === right || chars[j] === ")") {
        bracketCount++;
      }
    }
  }
}
