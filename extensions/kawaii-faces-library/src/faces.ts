export const FACE_TAGS = ["all", "happy", "sad", "heart", "sparkle"] as const;

export type FaceTag = (typeof FACE_TAGS)[number];

export type Face = {
  value: string;
  tags: FaceTag[];
  keywords?: string[];
};

export const faces: Face[] = [
  { value: "(✿◠‿◠)", tags: ["happy"], keywords: ["flower", "cute", "soft"] },
  {
    value: "ヽ(・∀・)ﾉ",
    tags: ["happy"],
    keywords: ["excited", "celebrate", "yay"],
  },
  {
    value: "(´｡• ᵕ •｡`)",
    tags: ["happy"],
    keywords: ["shy", "gentle", "soft"],
  },
  {
    value: "(｡♥‿♥｡)",
    tags: ["heart"],
    keywords: ["love", "crush", "adorable"],
  },
  {
    value: "(づ｡◕‿‿◕｡)づ",
    tags: ["happy", "heart"],
    keywords: ["hug", "comfort", "warm"],
  },
  { value: "(*≧ω≦*)", tags: ["happy"], keywords: ["fangirl", "hype"] },
  {
    value: "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    tags: ["happy", "sparkle"],
    keywords: ["magic", "party", "joy"],
  },
  {
    value: "(˶ᵔ ᵕ ᵔ˶)",
    tags: ["happy"],
    keywords: ["cozy", "content", "calm"],
  },
  { value: "(≧◡≦)", tags: ["happy"], keywords: ["smile", "sunny"] },
  {
    value: "(๑˃ᴗ˂)ﻭ",
    tags: ["happy"],
    keywords: ["energy", "victory", "motivate"],
  },
  {
    value: "(｡•̀ᴗ-)✧",
    tags: ["sparkle"],
    keywords: ["wink", "cool", "playful"],
  },
  { value: "(ฅ^•ﻌ•^ฅ)", tags: ["happy"], keywords: ["cat", "pet", "animal"] },
  { value: "ʕ•́ᴥ•̀ʔっ", tags: ["heart"], keywords: ["bear", "hug", "snuggle"] },
  {
    value: "(ᵔ◡ᵔ)",
    tags: ["happy"],
    keywords: ["simple", "gentle", "friendly"],
  },
  {
    value: "(˵ •̀ ᴗ - ˵ ) ✧",
    tags: ["sparkle"],
    keywords: ["wink", "confident", "cheeky"],
  },
  { value: "(๑>◡<๑)", tags: ["happy"], keywords: ["delight", "joy"] },
  {
    value: "(´꒳`)",
    tags: ["happy"],
    keywords: ["bliss", "content", "sleepy"],
  },
  {
    value: "( •̀ ω •́ )y",
    tags: ["happy"],
    keywords: ["determined", "focus", "strong"],
  },
  { value: "(╯✧▽✧)╯", tags: ["happy", "sparkle"], keywords: ["hype", "party"] },
  {
    value: "(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)",
    tags: ["heart"],
    keywords: ["blush", "shy", "flirty"],
  },
  {
    value: "(つ≧▽≦)つ",
    tags: ["happy", "heart"],
    keywords: ["hug", "greeting", "joy"],
  },
  { value: "owo", tags: ["happy"], keywords: ["classic", "meme"] },
  { value: "uwu", tags: ["happy"], keywords: ["classic", "soft"] },
  { value: ">w<", tags: ["happy"], keywords: ["tiny", "squee", "blush"] },
  { value: "^_^", tags: ["happy"], keywords: ["classic", "smile", "simple"] },
  {
    value: "(´,,•ω•,,)♡",
    tags: ["heart"],
    keywords: ["blush", "love", "adorable"],
  },
  { value: "(*ฅ́˘ฅ̀*)", tags: ["heart"], keywords: ["soft", "sleepy", "cozy"] },
  { value: "(｡•́︿•̀｡)", tags: ["sad"], keywords: ["upset", "teary", "pout"] },
  { value: "(╥﹏╥)", tags: ["sad"], keywords: ["cry", "tears", "hurt"] },
  {
    value: "(っ- ‸ - ς)",
    tags: ["sad"],
    keywords: ["small", "sulking", "blue"],
  },
  { value: "(｡╯︵╰｡)", tags: ["sad"], keywords: ["gloomy", "sigh", "down"] },
];
