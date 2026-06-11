/**
 * Formats a byte count into a human-readable string (e.g. 1.4 MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Validates that a smart list search query contains only qualified terms.
 * Karakeep disallows bare full-text search terms in smart list queries.
 * Valid qualifiers: #tag, is:*, url:*, after:*, before:*, list:*, type:*
 * Logical operators (and, or, not) and parentheses are also allowed.
 */
export function isValidSmartQuery(query: string | undefined): boolean {
  if (!query || !query.trim()) return false;
  // Strip logical operators, parentheses, quotes, and whitespace, then check
  // that every remaining token is a qualifier, not a bare keyword.
  const stripped = query.replace(/\band\b|\bor\b|\bnot\b/gi, " ").replace(/[()"-]/g, " ");
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const qualifierPattern = /^(-?(#\S+|is:\S+|url:\S+|after:\S+|before:\S+|list:\S+|type:\S+))$/i;
  return tokens.length > 0 && tokens.every((token) => qualifierPattern.test(token));
}

/**
 * Returns a useForm-compatible validator for the smart list query field.
 * Pass the `t` function from useTranslation to get localized error messages.
 */
export function makeSmartQueryValidator(t: (key: string) => string) {
  return (value: string | undefined, allValues?: { type?: string }) => {
    if (allValues?.type !== "smart") return undefined;
    if (!value?.trim()) return t("list.listQuery") + " is required";
    if (!isValidSmartQuery(value)) return t("list.listQueryInvalid");
    return undefined;
  };
}

/**
 * Validates if a string contains only emoji characters.
 * Empty strings are considered valid (for optional fields).
 */
export function isEmoji(str: string): boolean {
  if (!str) return true;
  // Strip variation selectors (\uFE0E, \uFE0F), ZWJ (\u200D), and combining
  // enclosing keycap (\u20E3) before testing — these are invisible modifiers
  // that appear in common emoji like ⭐️ (\u2B50\uFE0F) and 1️⃣.
  // Use alternation rather than a character class to avoid no-misleading-character-class.
  const normalized = str.trim().replace(/\uFE0E|\uFE0F|\u200D|\u20E3/g, "");
  const emojiRegex =
    /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/;
  return emojiRegex.test(normalized);
}

export interface EmojiOption {
  value: string;
  title: string;
}

export const LIST_ICON_EMOJI_OPTIONS: EmojiOption[] = [
  { value: "⭐️", title: "Star" },
  { value: "❤️", title: "Heart" },
  { value: "🔥", title: "Fire" },
  { value: "✨", title: "Sparkles" },
  { value: "🚀", title: "Rocket" },
  { value: "💡", title: "Idea" },
  { value: "📌", title: "Pin" },
  { value: "🔖", title: "Bookmark" },
  { value: "📚", title: "Books" },
  { value: "📝", title: "Note" },
  { value: "🎯", title: "Target" },
  { value: "📦", title: "Package" },
  { value: "🧰", title: "Toolbox" },
  { value: "🛠️", title: "Tools" },
  { value: "💼", title: "Work" },
  { value: "🏢", title: "Office" },
  { value: "💰", title: "Money" },
  { value: "📈", title: "Growth" },
  { value: "📊", title: "Chart" },
  { value: "✅", title: "Check" },
  { value: "⏳", title: "Pending" },
  { value: "📅", title: "Calendar" },
  { value: "🎉", title: "Celebrate" },
  { value: "🏠", title: "Home" },
  { value: "🍔", title: "Food" },
  { value: "🍜", title: "Ramen" },
  { value: "☕️", title: "Coffee" },
  { value: "🍷", title: "Wine" },
  { value: "🌱", title: "Nature" },
  { value: "🌎", title: "World" },
  { value: "🌤️", title: "Weather" },
  { value: "🏃", title: "Fitness" },
  { value: "🧘", title: "Wellness" },
  { value: "🎵", title: "Music" },
  { value: "🎬", title: "Movies" },
  { value: "🎮", title: "Gaming" },
  { value: "📷", title: "Photo" },
  { value: "🖼️", title: "Art" },
  { value: "🧠", title: "Learning" },
  { value: "🔬", title: "Science" },
  { value: "💻", title: "Computer" },
  { value: "🖥️", title: "Desktop" },
  { value: "📱", title: "Mobile" },
  { value: "🔐", title: "Security" },
  { value: "🧪", title: "Experiment" },
  { value: "🐛", title: "Bug" },
  { value: "⚡️", title: "Performance" },
  { value: "🤖", title: "AI" },
  { value: "🌐", title: "Web" },
  { value: "📎", title: "Attachment" },
  { value: "🔗", title: "Link" },
  { value: "🗂️", title: "Folder" },
  { value: "📁", title: "Files" },
  { value: "🗃️", title: "Archive" },
  { value: "⚙️", title: "Settings" },
  { value: "🔍", title: "Search" },
  { value: "🚧", title: "In Progress" },
  { value: "❗️", title: "Important" },
  { value: "🔒", title: "Private" },
  { value: "👀", title: "Read Later" },
  { value: "🧭", title: "Reference" },
  { value: "✈️", title: "Travel" },
  { value: "🛒", title: "Shopping" },
  { value: "📰", title: "News" },
];
