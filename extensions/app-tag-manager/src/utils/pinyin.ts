import { pinyin } from "pinyin-pro";

export function toPinyin(chinese: string): string {
  return pinyin(chinese, { toneType: "none", type: "array" }).join("");
}
