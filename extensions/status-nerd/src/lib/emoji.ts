export interface EmojiEntry {
  /** Slack-style shortcode, e.g. ":fire:" */
  code: string;
  /** Unicode character, e.g. "🔥" */
  char: string;
  /** Human-readable name for the picker */
  name: string;
}

/**
 * Curated set of emoji that exist on Slack, GitLab and GitHub alike.
 * Used by the emoji picker, the AI whitelist, and for displaying the
 * actual emoji next to a stored status.
 */
export const PICKER_EMOJIS: EmojiEntry[] = [
  { code: ":fire:", char: "🔥", name: "fire" },
  { code: ":rocket:", char: "🚀", name: "rocket" },
  { code: ":coffee:", char: "☕", name: "coffee" },
  { code: ":tea:", char: "🍵", name: "tea" },
  { code: ":brain:", char: "🧠", name: "brain" },
  { code: ":zap:", char: "⚡", name: "zap" },
  { code: ":dart:", char: "🎯", name: "dart / target" },
  { code: ":bulb:", char: "💡", name: "bulb / idea" },
  { code: ":skull:", char: "💀", name: "skull" },
  { code: ":ocean:", char: "🌊", name: "ocean" },
  { code: ":wrench:", char: "🔧", name: "wrench" },
  { code: ":hammer:", char: "🔨", name: "hammer" },
  { code: ":gear:", char: "⚙️", name: "gear" },
  { code: ":gift:", char: "🎁", name: "gift" },
  { code: ":tornado:", char: "🌪️", name: "tornado" },
  { code: ":alarm_clock:", char: "⏰", name: "alarm clock" },
  { code: ":hourglass:", char: "⌛", name: "hourglass" },
  { code: ":hourglass_flowing_sand:", char: "⏳", name: "hourglass (flowing)" },
  { code: ":crystal_ball:", char: "🔮", name: "crystal ball" },
  { code: ":game_die:", char: "🎲", name: "game die" },
  { code: ":compass:", char: "🧭", name: "compass" },
  { code: ":sparkles:", char: "✨", name: "sparkles" },
  { code: ":tada:", char: "🎉", name: "tada / party" },
  { code: ":boom:", char: "💥", name: "boom" },
  { code: ":dizzy:", char: "💫", name: "dizzy" },
  { code: ":zzz:", char: "💤", name: "zzz / sleep" },
  { code: ":rotating_light:", char: "🚨", name: "rotating light" },
  { code: ":warning:", char: "⚠️", name: "warning" },
  { code: ":construction:", char: "🚧", name: "construction" },
  { code: ":bug:", char: "🐛", name: "bug" },
  { code: ":bar_chart:", char: "📊", name: "bar chart" },
  { code: ":chart_with_upwards_trend:", char: "📈", name: "chart up" },
  { code: ":chart_with_downwards_trend:", char: "📉", name: "chart down" },
  { code: ":calendar:", char: "📅", name: "calendar" },
  { code: ":memo:", char: "📝", name: "memo" },
  { code: ":clipboard:", char: "📋", name: "clipboard" },
  { code: ":books:", char: "📚", name: "books" },
  { code: ":mag:", char: "🔍", name: "magnifier" },
  { code: ":computer:", char: "💻", name: "computer" },
  { code: ":telephone:", char: "☎️", name: "telephone" },
  { code: ":muscle:", char: "💪", name: "muscle" },
  { code: ":pray:", char: "🙏", name: "pray" },
  { code: ":raised_hands:", char: "🙌", name: "raised hands" },
  { code: ":clap:", char: "👏", name: "clap" },
  { code: ":eyes:", char: "👀", name: "eyes" },
  { code: ":thinking_face:", char: "🤔", name: "thinking" },
  { code: ":sunglasses:", char: "😎", name: "sunglasses" },
  { code: ":sweat_smile:", char: "😅", name: "sweat smile" },
  { code: ":sob:", char: "😭", name: "sob" },
  { code: ":ghost:", char: "👻", name: "ghost" },
  { code: ":robot_face:", char: "🤖", name: "robot" },
  { code: ":snail:", char: "🐌", name: "snail" },
  { code: ":turtle:", char: "🐢", name: "turtle" },
  { code: ":seedling:", char: "🌱", name: "seedling" },
  { code: ":recycle:", char: "♻️", name: "recycle" },
  { code: ":speech_balloon:", char: "💬", name: "speech balloon" },
];

/** Shortcodes only — used to constrain AI-generated emoji. */
export const SAFE_EMOJI_CODES = PICKER_EMOJIS.map((e) => e.code);
export const SAFE_EMOJI_SET = new Set(SAFE_EMOJI_CODES);

const CHAR_BY_CODE = new Map(PICKER_EMOJIS.map((e) => [e.code, e.char]));

/** Resolve a shortcode to its Unicode character, if known. */
export function charFor(code?: string): string | undefined {
  if (!code) return undefined;
  return CHAR_BY_CODE.get(code);
}
