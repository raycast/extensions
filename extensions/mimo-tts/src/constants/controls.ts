export interface ControlOption {
  value: string;
  title: string;
}

export const SPEECH_RATE_OPTIONS: ControlOption[] = [
  { value: "0", title: "Normal" },
  { value: "-50", title: "0.5x Slow" },
  { value: "-25", title: "0.75x Relaxed" },
  { value: "25", title: "1.25x Brisk" },
  { value: "50", title: "1.5x Fast" },
  { value: "100", title: "2.0x Very Fast" },
];

export const OPENING_STYLE_TAGS: ControlOption[] = [
  { value: "开心", title: "开心" },
  { value: "悲伤", title: "悲伤" },
  { value: "愤怒", title: "愤怒" },
  { value: "恐惧", title: "恐惧" },
  { value: "惊讶", title: "惊讶" },
  { value: "兴奋", title: "兴奋" },
  { value: "委屈", title: "委屈" },
  { value: "平静", title: "平静" },
  { value: "冷漠", title: "冷漠" },
  { value: "怅然", title: "怅然" },
  { value: "欣慰", title: "欣慰" },
  { value: "无奈", title: "无奈" },
  { value: "愧疚", title: "愧疚" },
  { value: "释然", title: "释然" },
  { value: "嫉妒", title: "嫉妒" },
  { value: "厌倦", title: "厌倦" },
  { value: "忐忑", title: "忐忑" },
  { value: "动情", title: "动情" },
  { value: "温柔", title: "温柔" },
  { value: "高冷", title: "高冷" },
  { value: "活泼", title: "活泼" },
  { value: "严肃", title: "严肃" },
  { value: "慵懒", title: "慵懒" },
  { value: "俏皮", title: "俏皮" },
  { value: "深沉", title: "深沉" },
  { value: "干练", title: "干练" },
  { value: "凌厉", title: "凌厉" },
  { value: "磁性", title: "磁性" },
  { value: "醇厚", title: "醇厚" },
  { value: "清亮", title: "清亮" },
  { value: "空灵", title: "空灵" },
  { value: "稚嫩", title: "稚嫩" },
  { value: "苍老", title: "苍老" },
  { value: "甜美", title: "甜美" },
  { value: "沙哑", title: "沙哑" },
  { value: "醇雅", title: "醇雅" },
  { value: "夹子音", title: "夹子音" },
  { value: "御姐音", title: "御姐音" },
  { value: "正太音", title: "正太音" },
  { value: "大叔音", title: "大叔音" },
  { value: "台湾腔", title: "台湾腔" },
  { value: "东北话", title: "东北话" },
  { value: "四川话", title: "四川话" },
  { value: "河南话", title: "河南话" },
  { value: "粤语", title: "粤语" },
  { value: "孙悟空", title: "孙悟空" },
  { value: "林黛玉", title: "林黛玉" },
  { value: "唱歌", title: "唱歌" },
];

export const RHYTHM_TAGS: ControlOption[] = [
  { value: "吸气", title: "吸气" },
  { value: "深呼吸", title: "深呼吸" },
  { value: "叹气", title: "叹气" },
  { value: "长叹一口气", title: "长叹一口气" },
  { value: "喘息", title: "喘息" },
  { value: "屏息", title: "屏息" },
  { value: "沉默片刻", title: "沉默片刻" },
  { value: "咳嗽", title: "咳嗽" },
  { value: "语速加快", title: "语速加快" },
  { value: "放慢语速", title: "放慢语速" },
  { value: "提高音量喊话", title: "提高音量喊话" },
  { value: "小声", title: "小声" },
];

export const EMOTION_TAGS: ControlOption[] = [
  { value: "开心", title: "开心" },
  { value: "悲伤", title: "悲伤" },
  { value: "愤怒", title: "愤怒" },
  { value: "恐惧", title: "恐惧" },
  { value: "惊讶", title: "惊讶" },
  { value: "兴奋", title: "兴奋" },
  { value: "委屈", title: "委屈" },
  { value: "平静", title: "平静" },
  { value: "冷漠", title: "冷漠" },
  { value: "紧张", title: "紧张" },
  { value: "害怕", title: "害怕" },
  { value: "激动", title: "激动" },
  { value: "疲惫", title: "疲惫" },
  { value: "撒娇", title: "撒娇" },
  { value: "心虚", title: "心虚" },
  { value: "震惊", title: "震惊" },
  { value: "不耐烦", title: "不耐烦" },
  { value: "压抑的愤怒", title: "压抑的愤怒" },
  { value: "带着哽咽的笑意", title: "带着哽咽的笑意" },
  { value: "温柔但疲惫", title: "温柔但疲惫" },
  { value: "狂躁中的温柔", title: "狂躁中的温柔" },
];

export const VOICE_FEATURE_TAGS: ControlOption[] = [
  { value: "颤抖", title: "颤抖" },
  { value: "声音颤抖", title: "声音颤抖" },
  { value: "变调", title: "变调" },
  { value: "破音", title: "破音" },
  { value: "鼻音", title: "鼻音" },
  { value: "气声", title: "气声" },
  { value: "沙哑", title: "沙哑" },
  { value: "哽咽", title: "哽咽" },
];

export const EXPRESSION_TAGS: ControlOption[] = [
  { value: "笑", title: "笑" },
  { value: "轻笑", title: "轻笑" },
  { value: "大笑", title: "大笑" },
  { value: "冷笑", title: "冷笑" },
  { value: "抽泣", title: "抽泣" },
  { value: "呜咽", title: "呜咽" },
  { value: "哽咽", title: "哽咽" },
  { value: "嚎啕大哭", title: "嚎啕大哭" },
];

export const PERFORMANCE_PRESETS: ControlOption[] = [
  { value: "", title: "None" },
  {
    value: "同一角色在同一段语音内完成播报、低语、嘶吼的多风格转场，过渡要自然不突兀。",
    title: "播报 → 低语 → 嘶吼",
  },
  {
    value: "用轻快上扬的语调向领导报喜，语速稍快，带着查到成绩后压抑不住的激动与小骄傲，声音明亮有活力。",
    title: "报喜：轻快上扬",
  },
  {
    value: "看着刚解决的难题成果忍不住得意忘形地惊呼，声音高亢明亮，语速偏快，语气中带着满满的自信与难以置信。",
    title: "得意惊呼",
  },
  {
    value: "用明亮活泼的青少年嗓音，带着恶作剧得逞后的得意与戏谑，语速偏快且咬字轻巧，在强调赌注时语气微微上扬。",
    title: "青少年戏谑",
  },
  { value: "整体表现为压抑的愤怒：声音克制、气息紧、情绪在句尾暗暗上涌。", title: "压抑的愤怒" },
  { value: "整体表现为带着哽咽的笑意：笑声很轻，尾音带一点颤和收不住的酸涩。", title: "哽咽的笑意" },
  { value: "整体表现为温柔但疲惫：声音柔和，语速放缓，气息略短，像是在勉力维持体面。", title: "温柔但疲惫" },
  { value: "整体表现为狂躁中的温柔：情绪起伏明显，但在关键句突然压低并柔下来。", title: "狂躁中的温柔" },
];
