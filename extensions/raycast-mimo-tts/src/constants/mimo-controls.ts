export interface ControlOption {
  value: string;
  title: string;
}

export const SPEECH_RATE_OPTIONS: ControlOption[] = [
  { value: "-50", title: "0.5x (Slow)" },
  { value: "-25", title: "0.75x (Relaxed)" },
  { value: "0", title: "1.0x (Normal)" },
  { value: "25", title: "1.25x (Brisk)" },
  { value: "50", title: "1.5x (Fast)" },
  { value: "75", title: "1.75x (Very Brisk)" },
  { value: "100", title: "2.0x (Very Fast)" },
];

const CORE_EMOTION_TAGS: ControlOption[] = [
  { value: "开心", title: "Happy" },
  { value: "悲伤", title: "Sad" },
  { value: "愤怒", title: "Angry" },
  { value: "恐惧", title: "Fearful" },
  { value: "惊讶", title: "Surprised" },
  { value: "兴奋", title: "Excited" },
  { value: "委屈", title: "Aggrieved" },
  { value: "平静", title: "Calm" },
  { value: "冷漠", title: "Detached" },
];

export const OPENING_STYLE_TAGS: ControlOption[] = [
  ...CORE_EMOTION_TAGS,
  { value: "怅然", title: "Melancholic" },
  { value: "欣慰", title: "Relieved" },
  { value: "无奈", title: "Resigned" },
  { value: "愧疚", title: "Guilty" },
  { value: "释然", title: "At Peace" },
  { value: "嫉妒", title: "Jealous" },
  { value: "厌倦", title: "Weary" },
  { value: "忐忑", title: "Uneasy" },
  { value: "动情", title: "Moved" },
  { value: "温柔", title: "Gentle" },
  { value: "高冷", title: "Aloof" },
  { value: "活泼", title: "Lively" },
  { value: "严肃", title: "Serious" },
  { value: "慵懒", title: "Languid" },
  { value: "俏皮", title: "Playful" },
  { value: "深沉", title: "Deep-Toned" },
  { value: "干练", title: "Polished" },
  { value: "凌厉", title: "Sharp" },
  { value: "磁性", title: "Magnetic" },
  { value: "醇厚", title: "Rich" },
  { value: "清亮", title: "Clear" },
  { value: "空灵", title: "Ethereal" },
  { value: "稚嫩", title: "Youthful" },
  { value: "苍老", title: "Aged" },
  { value: "甜美", title: "Sweet" },
  { value: "沙哑", title: "Husky" },
  { value: "醇雅", title: "Refined" },
  { value: "夹子音", title: "Cutesy Voice" },
  { value: "御姐音", title: "Mature Female Voice" },
  { value: "正太音", title: "Boyish Voice" },
  { value: "大叔音", title: "Mature Male Voice" },
  { value: "台湾腔", title: "Taiwanese Accent" },
  { value: "东北话", title: "Northeastern Dialect" },
  { value: "四川话", title: "Sichuan Dialect" },
  { value: "河南话", title: "Henan Dialect" },
  { value: "粤语", title: "Cantonese" },
  { value: "孙悟空", title: "Sun Wukong" },
  { value: "林黛玉", title: "Lin Daiyu" },
  { value: "唱歌", title: "Singing" },
];

export const RHYTHM_TAGS: ControlOption[] = [
  { value: "吸气", title: "Inhale" },
  { value: "深呼吸", title: "Deep Breath" },
  { value: "叹气", title: "Sigh" },
  { value: "长叹一口气", title: "Long Sigh" },
  { value: "喘息", title: "Panting" },
  { value: "屏息", title: "Breath Hold" },
  { value: "沉默片刻", title: "Brief Silence" },
  { value: "咳嗽", title: "Cough" },
  { value: "语速加快", title: "Speed Up" },
  { value: "放慢语速", title: "Slow Down" },
  { value: "提高音量喊话", title: "Louder Voice" },
  { value: "小声", title: "Soft Voice" },
];

export const EMOTION_TAGS: ControlOption[] = [
  ...CORE_EMOTION_TAGS,
  { value: "紧张", title: "Nervous" },
  { value: "害怕", title: "Scared" },
  { value: "激动", title: "Worked Up" },
  { value: "疲惫", title: "Tired" },
  { value: "撒娇", title: "Coy" },
  { value: "心虚", title: "Guilty and Uneasy" },
  { value: "震惊", title: "Shocked" },
  { value: "不耐烦", title: "Impatient" },
  { value: "压抑的愤怒", title: "Suppressed Anger" },
  { value: "带着哽咽的笑意", title: "Tearful Smile" },
  { value: "温柔但疲惫", title: "Gentle but Tired" },
  { value: "狂躁中的温柔", title: "Gentleness Amid Frenzy" },
];

export const VOICE_FEATURE_TAGS: ControlOption[] = [
  { value: "颤抖", title: "Trembling" },
  { value: "声音颤抖", title: "Shaky Voice" },
  { value: "变调", title: "Pitch Shift" },
  { value: "破音", title: "Voice Crack" },
  { value: "鼻音", title: "Nasal Tone" },
  { value: "气声", title: "Breathy Voice" },
  { value: "沙哑", title: "Hoarse" },
  { value: "哽咽", title: "Choked Voice" },
];

export const EXPRESSION_TAGS: ControlOption[] = [
  { value: "笑", title: "Laugh" },
  { value: "轻笑", title: "Soft Laugh" },
  { value: "大笑", title: "Loud Laugh" },
  { value: "冷笑", title: "Cold Laugh" },
  { value: "抽泣", title: "Sobbing" },
  { value: "呜咽", title: "Whimpering" },
  { value: "哽咽", title: "Choked Up" },
  { value: "嚎啕大哭", title: "Wailing" },
];

export const PERFORMANCE_PRESETS: ControlOption[] = [
  { value: "", title: "None" },
  {
    value:
      "Have the same character shift from narration to whispering to roaring within one passage, with smooth and natural transitions.",
    title: "Narration to Whisper to Roar",
  },
  {
    value:
      "Report good news with a bright upward tone, slightly fast pace, contained excitement, a hint of pride, and lively energy.",
    title: "Upbeat Good News",
  },
  {
    value:
      "React to a newly solved hard problem with a delighted exclamation, high and bright voice, brisk pace, strong confidence, and disbelief.",
    title: "Delighted Exclamation",
  },
  {
    value:
      "Use a bright and lively teenage voice with playful mischief, a quick pace, light articulation, and a slight upward lift on the punchline.",
    title: "Playful Teen Tease",
  },
  {
    value:
      "Perform with suppressed anger: restrained voice, tight breath, and emotion quietly rising at the end of sentences.",
    title: "Suppressed Anger",
  },
  {
    value:
      "Perform with a tearful smile: the laugh is very light, with a trembling tail and a bitterness that cannot quite be hidden.",
    title: "Tearful Smile",
  },
  {
    value:
      "Perform as gentle but tired: soft voice, slower pace, slightly short breath, as if trying hard to stay composed.",
    title: "Gentle but Tired",
  },
  {
    value:
      "Perform with gentleness amid frenzy: keep the emotional swings clear, but suddenly lower and soften the voice on key lines.",
    title: "Gentleness Amid Frenzy",
  },
];
