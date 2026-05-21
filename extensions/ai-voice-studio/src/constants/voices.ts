import type { VoiceConfig, VoiceListResponse, MiniMaxVoicePayload } from "../api/types";

export const DEFAULT_VOICE_ID = "Chinese (Mandarin)_Radio_Host";

const CATEGORY_PRIORITY = ["中文普通话", "粤语", "English", "German", "Custom"] as const;

const CATEGORY_SEARCH_ALIASES: Record<string, string[]> = {
  中文普通话: ["中文", "普通话", "汉语", "国语", "Chinese", "Mandarin", "zh", "zh-CN", "cn"],
  粤语: ["粤语", "广东话", "Cantonese", "Yue", "Chinese,Yue", "zh-HK", "zh-Yue"],
  English: ["英语", "英文", "English", "American English", "en", "en-US"],
  German: ["德语", "德文", "German", "Deutsch", "de", "de-DE"],
  Japanese: ["日语", "日文", "Japanese", "ja", "ja-JP"],
  Korean: ["韩语", "韩文", "Korean", "ko", "ko-KR"],
  Custom: ["自定义", "custom", "custom voice", "voice id"],
  "System Voices": ["系统", "系统音色", "system", "system voice"],
  "Cloned Voices": ["克隆", "克隆音色", "clone", "cloned voice"],
  "Generated Voices": ["生成", "生成音色", "generated", "generated voice"],
};

const GENDER_SEARCH_ALIASES: Record<NonNullable<VoiceConfig["gender"]>, string[]> = {
  female: ["女", "女声", "female", "woman"],
  male: ["男", "男声", "male", "man"],
  unknown: [],
};

export const FALLBACK_VOICES: VoiceConfig[] = [
  {
    id: "Chinese (Mandarin)_Radio_Host",
    name: "电台男主播",
    category: "中文普通话",
    description: "有温度、节奏松弛的男声，适合论文、书稿和长时间导览型听书。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Sincere_Adult",
    name: "真诚青年",
    category: "中文普通话",
    description: "真诚稳重、同辈聊天感强，适合论文讲解和评注式阅读。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Gentleman",
    name: "温润男声",
    category: "中文普通话",
    description: "温润耐心、有书卷气，适合导师讲解感的长文阅读。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Gentle_Youth",
    name: "温润青年",
    category: "中文普通话",
    description: "年轻温和的男声，适合自然、低压力的材料阅读。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Lyrical_Voice",
    name: "抒情男声",
    category: "中文普通话",
    description: "柔和抒情的男声，适合散文化论文、随笔和讲稿。",
    gender: "male",
  },
  {
    id: "hunyin_6",
    name: "舒朗男声",
    category: "中文普通话",
    description: "清亮、干脆利落、意气风发的男声，适合更有精神的论文导读和讲稿试听。",
    gender: "male",
  },
  {
    id: "male-qn-jingying",
    name: "精英青年",
    category: "中文普通话",
    description: "专业清晰的青年男声，比高管音色更年轻、有同辈感。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Wise_Women",
    name: "阅历姐姐",
    category: "中文普通话",
    description: "知性娓娓的女性声音，适合前辈引路式的论文听读。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Gentle_Senior",
    name: "温柔学姐",
    category: "中文普通话",
    description: "温婉柔和、娓娓道来且亲切有感染力的女性声音，适合书与小说、纪录片和论文随听。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Warm_Bestie",
    name: "温暖闺蜜",
    category: "中文普通话",
    description: "温柔清亮、舒缓且充满关切的年轻女声，亲切自然，适合疗愈感听读。",
    gender: "female",
  },
  {
    id: "Chinese_sweet_girl_vv1",
    name: "甜美少女",
    category: "中文普通话",
    description: "清脆、富有表现力且朝气蓬勃的年轻女声，适合轻松文章、笔记和更活泼的短段落听读。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Reliable_Executive",
    name: "沉稳高管",
    category: "中文普通话",
    description: "沉稳可靠的中年男性声音，适合正式材料和政策文本。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_News_Anchor",
    name: "新闻女声",
    category: "中文普通话",
    description: "专业播音腔女声，适合朗读新闻、论文和正式材料。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Male_Announcer",
    name: "播报男声",
    category: "中文普通话",
    description: "富有磁性的中年男性播报员声音，适合庄重文本。",
    gender: "male",
  },
  {
    id: "English_CalmWoman",
    name: "Calm Woman",
    category: "English",
    description: "Warm, clear, calm American English female voice for audiobooks, documentaries, and education.",
    gender: "female",
  },
  {
    id: "English_captivating_female1",
    name: "Captivating Female",
    category: "English",
    description: "Bright, clear, enthusiastic American English female voice for knowledge sharing and explainers.",
    gender: "female",
  },
  {
    id: "English_AttractiveGirl",
    name: "Attractive Woman",
    category: "English",
    description:
      "Sweet, natural, neighborly American English female voice for conversational reading and social narration.",
    gender: "female",
  },
  {
    id: "English_nursery_teacher_vv2",
    name: "Nursery Teacher",
    category: "English",
    description: "Sweet, natural, clear American English female voice with a warm, encouraging teaching tone.",
    gender: "female",
  },
  {
    id: "English_expressive_narrator",
    name: "Expressive Narrator",
    category: "English",
    description: "Expressive English narrator.",
    gender: "female",
  },
  {
    id: "English_magnetic_voiced_man",
    name: "Magnetic-voiced Male",
    category: "English",
    description: "Magnetic English male voice.",
    gender: "male",
  },
  {
    id: "English_Graceful_Lady",
    name: "Graceful Lady",
    category: "English",
    description: "Graceful English female voice.",
    gender: "female",
  },
  {
    id: "German_FriendlyMan",
    name: "Friendly Man",
    category: "German",
    description: "轻松自然、真诚友好的德语男声，适合德语文章、对话和长段落听读。",
    gender: "male",
  },
  {
    id: "German_SweetLady",
    name: "Sweet Lady",
    category: "German",
    description: "灵动甜美的德语青年女声，适合自然轻快的德语短文、对话和日常听读。",
    gender: "female",
  },
  {
    id: "German_PlayfulMan",
    name: "Playful Man",
    category: "German",
    description: "自然清亮、轻快流畅的德语青年男声，适合亲密交谈感的德语听读。",
    gender: "male",
  },
];

export function normalizeVoiceList(payload: VoiceListResponse): VoiceConfig[] {
  const voices = [
    ...normalizeVoiceGroup(payload.system_voice, "System Voices"),
    ...normalizeVoiceGroup(payload.voice_cloning, "Cloned Voices"),
    ...normalizeVoiceGroup(payload.voice_generation, "Generated Voices"),
  ];

  if (voices.length === 0) return FALLBACK_VOICES;

  return sortVoices(voices);
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return FALLBACK_VOICES.find((voice) => voice.id === id);
}

export function groupVoicesByCategory(voices: VoiceConfig[]): Array<[string, VoiceConfig[]]> {
  const groups = new Map<string, VoiceConfig[]>();
  for (const voice of sortVoices(voices)) {
    const group = groups.get(voice.category) || [];
    group.push(voice);
    groups.set(voice.category, group);
  }
  return Array.from(groups.entries()).sort(([categoryA], [categoryB]) => compareCategories(categoryA, categoryB));
}

export function getVoiceSearchKeywords(voice: VoiceConfig): string[] {
  return uniqueSearchKeywords([
    voice.id,
    voice.name,
    voice.category,
    voice.description,
    voice.gender,
    ...getCategorySearchAliases(voice.category),
    ...getGenderSearchAliases(voice.gender),
  ]);
}

export function collectCustomVoiceIds(
  customDefaultVoice?: string,
  customVoiceIds?: string,
  ...extraVoiceIds: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const voiceIds: string[] = [];

  for (const voiceId of [customDefaultVoice, ...parseCustomVoiceIds(customVoiceIds), ...extraVoiceIds]) {
    const trimmed = voiceId?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    voiceIds.push(trimmed);
  }

  return voiceIds;
}

export function addCustomVoices(voices: VoiceConfig[], customVoiceIds: string[]): VoiceConfig[] {
  if (customVoiceIds.length === 0) return voices;

  const existingVoiceIds = new Set(voices.map((voice) => voice.id));
  const customVoices: VoiceConfig[] = customVoiceIds
    .filter((voiceId) => !existingVoiceIds.has(voiceId))
    .map((voiceId) => ({
      id: voiceId,
      name: voiceId,
      category: "Custom",
      gender: "unknown",
      isCustom: true,
    }));

  // Keep explicit custom IDs available while letting the picker apply the
  // MiniMax language-priority order at render time.
  return customVoices.length > 0 ? [...customVoices, ...voices] : voices;
}

function normalizeVoiceGroup(voices: MiniMaxVoicePayload[] | undefined, fallbackCategory: string): VoiceConfig[] {
  if (!voices) return [];

  return voices
    .filter((voice) => voice.voice_id)
    .map((voice) => {
      const description = voice.description?.filter(Boolean).join(" ") || undefined;
      return {
        id: voice.voice_id,
        name: voice.voice_name || voice.voice_id,
        category: detectCategory(voice.voice_id, fallbackCategory),
        description,
        gender: detectGender(`${voice.voice_name || ""} ${description || ""} ${voice.voice_id}`),
      };
    });
}

function parseCustomVoiceIds(rawVoiceIds: string | undefined): string[] {
  if (!rawVoiceIds) return [];
  return rawVoiceIds
    .split(/[,;，；\n\r]+/u)
    .map((voiceId) => voiceId.trim())
    .filter(Boolean);
}

function detectCategory(voiceId: string, fallbackCategory: string): string {
  if (voiceId.includes("Chinese (Mandarin)")) return "中文普通话";
  if (voiceId.startsWith("Chinese_")) return "中文普通话";
  if (voiceId.includes("Chinese,Yue") || voiceId.includes("Cantonese")) return "粤语";
  if (voiceId.startsWith("English_")) return "English";
  if (voiceId.startsWith("German_")) return "German";
  if (voiceId.startsWith("Japanese_")) return "Japanese";
  if (voiceId.startsWith("Korean_")) return "Korean";
  return fallbackCategory;
}

function detectGender(text: string): VoiceConfig["gender"] {
  const lower = text.toLowerCase();
  if (lower.includes("female") || lower.includes("woman") || lower.includes("lady") || text.includes("女"))
    return "female";
  if (lower.includes("male") || lower.includes("man") || lower.includes("gentleman") || text.includes("男"))
    return "male";
  return "unknown";
}

function sortVoices(voices: VoiceConfig[]): VoiceConfig[] {
  return [...voices].sort((a, b) => {
    const categoryCompare = compareCategories(a.category, b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name, "zh-Hans");
  });
}

function compareCategories(categoryA: string, categoryB: string): number {
  const priorityCompare = getCategoryPriority(categoryA) - getCategoryPriority(categoryB);
  if (priorityCompare !== 0) return priorityCompare;
  return categoryA.localeCompare(categoryB, "zh-Hans");
}

function getCategoryPriority(category: string): number {
  const priority = CATEGORY_PRIORITY.indexOf(category as (typeof CATEGORY_PRIORITY)[number]);
  return priority === -1 ? CATEGORY_PRIORITY.length : priority;
}

function getCategorySearchAliases(category: string): string[] {
  return CATEGORY_SEARCH_ALIASES[category] || [];
}

function getGenderSearchAliases(gender: VoiceConfig["gender"]): string[] {
  return gender && gender in GENDER_SEARCH_ALIASES
    ? GENDER_SEARCH_ALIASES[gender as NonNullable<VoiceConfig["gender"]>]
    : [];
}

function uniqueSearchKeywords(values: unknown[]): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const keyword = value.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    keywords.push(keyword);
  }

  return keywords;
}
