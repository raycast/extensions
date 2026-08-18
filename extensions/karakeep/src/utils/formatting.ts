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
export function makeSmartQueryValidator(t: (key: string, params?: Record<string, string>) => string) {
  return (value: string | undefined, allValues?: { type?: string }) => {
    if (allValues?.type !== "smart") return undefined;
    if (!value?.trim()) return t("common.fieldRequired", { field: t("list.listQuery") });
    if (!isValidSmartQuery(value)) return t("list.listQueryInvalid");
    return undefined;
  };
}

/**
 * Whether a string is exactly ONE emoji. Empty is valid — the caller
 * substitutes a default.
 *
 * Deliberately not `+`: a list icon is one glyph, and the field's own error
 * message says "Must be a single emoji", so accepting `😀😀` contradicted the
 * thing the UI had just told the user.
 *
 * Uses Unicode's own RGI_Emoji property rather than a hand-rolled codepoint
 * range. The previous regex stripped U+20E3 and then tested `1️⃣` as the plain
 * character `1`, so every keycap emoji was rejected — including three the
 * picker itself offers.
 *
 * The second test drops variation selectors: `⭐️` is U+2B50 U+FE0F, but U+2B50
 * already defaults to emoji presentation, so the RGI sequence is the bare
 * character and the decorated form fails the first test.
 */
const SINGLE_EMOJI = /^\p{RGI_Emoji}$/v;

export function isEmoji(str: string): boolean {
  const value = str.trim();
  if (!value) return true;
  return SINGLE_EMOJI.test(value) || SINGLE_EMOJI.test(value.replace(/\uFE0F/g, ""));
}

/**
 * Suggestions for the list icon picker — a shortcut, not a ceiling. The field
 * itself takes any emoji, so this list only has to cover the common cases.
 */
export interface EmojiOption {
  value: string;
  title: string;
  /** Extra search terms, since the title alone is often not what you'd type. */
  keywords?: string;
}

export const LIST_ICON_EMOJI_OPTIONS: EmojiOption[] = [
  { value: "⭐️", title: "Star", keywords: "favorite starred best top" },
  { value: "❤️", title: "Heart", keywords: "love favorite like heart" },
  { value: "🔥", title: "Fire", keywords: "hot trending popular fire lit" },
  { value: "✨", title: "Sparkles", keywords: "magic new shiny smart sparkle" },
  { value: "🚀", title: "Rocket", keywords: "launch ship startup fast rocket" },
  { value: "💡", title: "Idea", keywords: "idea inspiration tip lightbulb" },
  { value: "📌", title: "Pin", keywords: "pin pinned important sticky" },
  { value: "🔖", title: "Bookmark", keywords: "bookmark save read tag default" },
  { value: "📚", title: "Books", keywords: "books reading library shelf" },
  { value: "📝", title: "Note", keywords: "notes writing memo draft" },
  { value: "🎯", title: "Target", keywords: "goals target focus objective" },
  { value: "📦", title: "Package", keywords: "package box archive shipping inbox" },
  { value: "🧰", title: "Toolbox", keywords: "toolbox utilities kit resources" },
  { value: "🛠️", title: "Tools", keywords: "tools build diy hardware" },
  { value: "💼", title: "Work", keywords: "work business job career professional" },
  { value: "🏢", title: "Office", keywords: "office company workplace corporate" },
  { value: "💰", title: "Money", keywords: "money finance budget cash salary" },
  { value: "📈", title: "Growth", keywords: "growth metrics revenue up trending" },
  { value: "📊", title: "Chart", keywords: "chart data analytics stats dashboard" },
  { value: "✅", title: "Check", keywords: "done complete todo checked finished" },
  { value: "⏳", title: "Pending", keywords: "pending waiting later someday queue" },
  { value: "📅", title: "Calendar", keywords: "calendar schedule events planning dates" },
  { value: "🎉", title: "Celebrate", keywords: "celebrate party wins launch fun" },
  { value: "🏠", title: "Home", keywords: "home house personal family living" },
  { value: "🍔", title: "Food", keywords: "food eating restaurants recipes burger" },
  { value: "🍜", title: "Ramen", keywords: "ramen noodles asian food soup" },
  { value: "☕️", title: "Coffee", keywords: "coffee cafe morning caffeine tea" },
  { value: "🍷", title: "Wine", keywords: "wine drinks bar alcohol cocktails" },
  { value: "🌱", title: "Nature", keywords: "nature plants garden growth eco green" },
  { value: "🌎", title: "World", keywords: "world global earth international travel" },
  { value: "🌤️", title: "Weather", keywords: "weather climate forecast sky" },
  { value: "🏃", title: "Fitness", keywords: "fitness running exercise workout sports" },
  { value: "🧘", title: "Wellness", keywords: "wellness health meditation mindfulness yoga" },
  { value: "🎵", title: "Music", keywords: "music songs playlists audio albums" },
  { value: "🎬", title: "Movies", keywords: "movies film video watch cinema tv" },
  { value: "🎮", title: "Gaming", keywords: "gaming games video games play console" },
  { value: "📷", title: "Photo", keywords: "photo photography camera pictures" },
  { value: "🖼️", title: "Art", keywords: "art design gallery images inspiration" },
  { value: "🧠", title: "Learning", keywords: "learning knowledge study brain smart education" },
  { value: "🔬", title: "Science", keywords: "science research lab experiments" },
  { value: "💻", title: "Computer", keywords: "computer code dev programming software laptop" },
  { value: "🖥️", title: "Desktop", keywords: "desktop hardware setup monitor" },
  { value: "📱", title: "Mobile", keywords: "mobile phone ios android apps" },
  { value: "🔐", title: "Security", keywords: "security privacy passwords encryption safety" },
  { value: "🧪", title: "Experiment", keywords: "experiment testing lab beta trial" },
  { value: "🐛", title: "Bug", keywords: "bug issue defect debug problem" },
  { value: "⚡️", title: "Performance", keywords: "performance speed fast optimization energy" },
  { value: "🤖", title: "AI", keywords: "ai ml llm automation bots robot" },
  { value: "🌐", title: "Web", keywords: "web internet websites online browser" },
  { value: "📎", title: "Attachment", keywords: "attachment files clip misc" },
  { value: "🔗", title: "Link", keywords: "link url reference href" },
  { value: "🗂️", title: "Folder", keywords: "folder organize categories dividers" },
  { value: "📁", title: "Files", keywords: "files documents folder storage" },
  { value: "🗃️", title: "Archive", keywords: "archive old storage backup records" },
  { value: "⚙️", title: "Settings", keywords: "settings config preferences setup tools" },
  { value: "🔍", title: "Search", keywords: "search find lookup discovery research" },
  { value: "🚧", title: "In Progress", keywords: "in progress wip todo building unfinished" },
  { value: "❗️", title: "Important", keywords: "important urgent priority attention critical" },
  { value: "🔒", title: "Private", keywords: "private locked secret confidential" },
  { value: "👀", title: "Read Later", keywords: "read later watchlist reading queue eyes" },
  { value: "🧭", title: "Reference", keywords: "reference guides docs navigation compass" },
  { value: "✈️", title: "Travel", keywords: "travel flights trips vacation places" },
  { value: "🛒", title: "Shopping", keywords: "shopping buy wishlist store ecommerce" },
  { value: "📰", title: "News", keywords: "news articles press media journalism" },
];
