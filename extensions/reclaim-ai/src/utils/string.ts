import { emojiFindingRegex } from "./emoji-helper";

export function getFirstEmojiFromString(text: string): string | undefined {
  let emoji;
  // try the simpler parser first
  // then complex emoji regex grabs flags but can fail some emojis

  emoji = /(\p{EPres}|\p{ExtPict})(\u200d(\p{EPres}|\p{ExtPict}))*/gu.exec(text);

  if (emoji === null) {
    emoji = emojiFindingRegex().exec(text);
  }

  if (!!emoji && emoji.index === 0) return emoji[0];
  else return undefined;
}

export function stripPlannerEmojis(text: string): string {
  const emoji = getFirstEmojiFromString(text);

  if (emoji === "🆓" || emoji === "🛡" || emoji === "🔒" || emoji === "✅" || emoji === "⚠️") {
    const textWithoutEmoji = text.slice(2);
    return textWithoutEmoji;
  } else return text;
}
