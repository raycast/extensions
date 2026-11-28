import { extractBoundaryMapping } from "text-search-engine";

const characterMasks = new Map<string, number>();
export function letterMask(source: string): number {
  let mask = 0;
  for (const char of source) {
    const code = char.charCodeAt(0);
    if (code >= 97 && code <= 122) mask |= 1 << (code - 97);
    else if (code > 127) {
      let cached = characterMasks.get(char);
      if (cached === undefined) {
        cached = 0;
        // 仅复用引擎的拼音展开，不引入第二套字典或匹配规则。
        for (const letter of extractBoundaryMapping(char).pinyinString) {
          const code = letter.charCodeAt(0);
          if (code >= 97 && code <= 122) cached |= 1 << (code - 97);
        }
        characterMasks.set(char, cached);
      }
      mask |= cached;
    }
  }
  return mask;
}
