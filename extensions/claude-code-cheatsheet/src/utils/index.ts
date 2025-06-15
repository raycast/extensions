import { Command, ThinkingKeyword } from "../types";

/**
 * itemがCommand型であるかを判定する型ガード関数
 * thinkingカテゴリはThinkingKeywordとして扱いため、除外する
 */
export const isCommand = (item: Command | ThinkingKeyword): item is Command => {
  return "category" in item && item.category !== "thinking";
};
