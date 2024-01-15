import { emojiFindingRegex } from "./emoji-helper";

export function parseEmojiField(text: string): { emoji?: string; textWithoutEmoji: string } {
  // complex emoji regex grabs flags but can fail some emojis
  let emoji = emojiFindingRegex().exec(text);
  // if it fails try the simpler parser
  if (!emoji) emoji = /(\p{EPres}|\p{ExtPict})(\u200d(\p{EPres}|\p{ExtPict}))*/gu.exec(text);

  return {
    emoji: emoji && emoji.index === 0 ? emoji[0] : undefined,
    textWithoutEmoji: emoji && emoji.index === 0 ? text.replace(emoji[0], "").trimStart() : text,
  };
}
