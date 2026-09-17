export interface StatusItem {
  /** Slack/GitHub colon shortcode, e.g. ":fire:" */
  emoji: string;
  text: string;
  /** Actual emoji character, used for display/HUD, e.g. "🔥" */
  gitlab_emoji: string;
}

export const STATUSES: StatusItem[] = [
  { emoji: ":fire:", text: "Putting out fires since 9am", gitlab_emoji: "🔥" },
  {
    emoji: ":coffee:",
    text: "Powered by caffeine and deadlines",
    gitlab_emoji: "☕",
  },
  { emoji: ":skull:", text: "Survived another meeting", gitlab_emoji: "💀" },
  {
    emoji: ":alarm_clock:",
    text: "Five minutes late to everything",
    gitlab_emoji: "⏰",
  },
  {
    emoji: ":brain:",
    text: "Brain buffering, please wait",
    gitlab_emoji: "🧠",
  },
  {
    emoji: ":sweat_smile:",
    text: "Pretending to multitask",
    gitlab_emoji: "😅",
  },
  { emoji: ":snail:", text: "Running on Monday energy", gitlab_emoji: "🐌" },
  { emoji: ":zzz:", text: "Awake in theory only", gitlab_emoji: "💤" },
  { emoji: ":dart:", text: "Aiming for good enough", gitlab_emoji: "🎯" },
  { emoji: ":ocean:", text: "Riding the inbox wave", gitlab_emoji: "🌊" },
  {
    emoji: ":game_die:",
    text: "Winging it professionally",
    gitlab_emoji: "🎲",
  },
  { emoji: ":rocket:", text: "Looks busy, might be", gitlab_emoji: "🚀" },
  { emoji: ":bulb:", text: "Had one good idea today", gitlab_emoji: "💡" },
  {
    emoji: ":hourglass_flowing_sand:",
    text: "Third coffee, first task",
    gitlab_emoji: "⏳",
  },
  { emoji: ":pray:", text: "Praying the wifi holds", gitlab_emoji: "🙏" },
  {
    emoji: ":eyes:",
    text: "Watching the clock, not the work",
    gitlab_emoji: "👀",
  },
  {
    emoji: ":thinking_face:",
    text: "Overthinking a one-line reply",
    gitlab_emoji: "🤔",
  },
  {
    emoji: ":sunglasses:",
    text: "Faking confidence since breakfast",
    gitlab_emoji: "😎",
  },
  { emoji: ":boom:", text: "My calendar just exploded", gitlab_emoji: "💥" },
  {
    emoji: ":construction:",
    text: "Under construction (it's me)",
    gitlab_emoji: "🚧",
  },
  {
    emoji: ":warning:",
    text: "Do not disturb, barely functioning",
    gitlab_emoji: "⚠️",
  },
  { emoji: ":turtle:", text: "Slow and steadily behind", gitlab_emoji: "🐢" },
  { emoji: ":muscle:", text: "Wrestling my to-do list", gitlab_emoji: "💪" },
  { emoji: ":tada:", text: "Celebrating small wins", gitlab_emoji: "🎉" },
  { emoji: ":tornado:", text: "Eye of the deadline storm", gitlab_emoji: "🌪️" },
  { emoji: ":robot_face:", text: "Running on autopilot", gitlab_emoji: "🤖" },
  { emoji: ":ghost:", text: "Ghosting my notifications", gitlab_emoji: "👻" },
  {
    emoji: ":crystal_ball:",
    text: "Predicting even more meetings",
    gitlab_emoji: "🔮",
  },
  {
    emoji: ":zap:",
    text: "Sprinting through another quick sync",
    gitlab_emoji: "⚡",
  },
  {
    emoji: ":dizzy:",
    text: "Spinning plates, dropping some",
    gitlab_emoji: "💫",
  },
];

export function randomStatus(): StatusItem {
  return STATUSES[Math.floor(Math.random() * STATUSES.length)];
}
