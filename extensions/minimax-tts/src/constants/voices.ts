import type { VoiceConfig, VoiceListResponse, MiniMaxVoicePayload } from "../api/types";

export const DEFAULT_VOICE_ID = "Chinese (Mandarin)_News_Anchor";

export const FALLBACK_VOICES: VoiceConfig[] = [
  {
    id: "Chinese (Mandarin)_News_Anchor",
    name: "新闻女声",
    category: "中文普通话",
    description: "专业播音腔女声，适合朗读新闻、论文和正式材料。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Warm_Bestie",
    name: "温暖闺蜜",
    category: "中文普通话",
    description: "温暖清脆的青年女性声音。",
    gender: "female",
  },
  {
    id: "Chinese (Mandarin)_Reliable_Executive",
    name: "沉稳高管",
    category: "中文普通话",
    description: "沉稳可靠的中年男性声音。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Male_Announcer",
    name: "播报男声",
    category: "中文普通话",
    description: "富有磁性的中年男性播报员声音。",
    gender: "male",
  },
  {
    id: "Chinese (Mandarin)_Gentleman",
    name: "温润男声",
    category: "中文普通话",
    description: "温润磁性的青年男性声音。",
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
