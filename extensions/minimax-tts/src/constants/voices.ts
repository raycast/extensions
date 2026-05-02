import type { VoiceConfig, VoiceListResponse, MiniMaxVoicePayload } from "../api/types";

export const DEFAULT_VOICE_ID = "Chinese (Mandarin)_Radio_Host";

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
];

export function normalizeVoiceList(payload: VoiceListResponse): VoiceConfig[] {
  const voices = [
    ...normalizeVoiceGroup(payload.system_voice, "System Voices"),
    ...normalizeVoiceGroup(payload.voice_cloning, "Cloned Voices"),
    ...normalizeVoiceGroup(payload.voice_generation, "Generated Voices"),
  ];

  if (voices.length === 0) return FALLBACK_VOICES;

  return voices.sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name);
  });
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return FALLBACK_VOICES.find((voice) => voice.id === id);
}

export function groupVoicesByCategory(voices: VoiceConfig[]): Array<[string, VoiceConfig[]]> {
  const groups = new Map<string, VoiceConfig[]>();
  for (const voice of voices) {
    const group = groups.get(voice.category) || [];
    group.push(voice);
    groups.set(voice.category, group);
  }
  return Array.from(groups.entries());
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

  // Surface custom voices first so the IDs the user explicitly added land at
  // the top of the picker rather than under every MiniMax category.
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
  if (voiceId.includes("Chinese,Yue") || voiceId.includes("Cantonese")) return "粤语";
  if (voiceId.startsWith("English_")) return "English";
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
