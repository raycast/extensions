import { Duration } from "./duration";

export interface Article {
  article_id: string;
  title: string;
  description: string;
  articleLink: string;
  imageLink: string;
  duration: Duration;
  category: string;
  url: string;
}

export const iconToEmojiMap = new Map<string, string>([
  ["Annonsmaterial", "📢"],
  ["Ekonomi", "📈"],
  ["Nöje & kultur", "🎭"],
  ["Utrikes", "🌍"],
  ["Inrikes", "📰"],
  ["Politik", "🗣️"],
  ["Sport", "⚽️"],
  ["Tech", "📱"],
  ["Opinion", "🔈"],
  ["Perspektiv på världen", "🌍"],
  ["Innovation & framtid", "🔮"],
]);
