import type { MinimaxLanguageBoost, MinimaxTTSFormat, MinimaxTTSModel, VoiceConfig } from "../api/minimax-tts-types";

export const DEFAULT_MODEL: MinimaxTTSModel = "speech-2.8-hd";
export const DEFAULT_VOICE = "Chinese (Mandarin)_Radio_Host";
export const DEFAULT_FORMAT: MinimaxTTSFormat = "mp3";
export const DEFAULT_LANGUAGE_BOOST: MinimaxLanguageBoost = "auto";
export const DEFAULT_BASE_URL = "https://api.minimaxi.com";
export const DEFAULT_VOLUME = 1;
export const DEFAULT_PITCH = 0;
export const DEFAULT_SAMPLE_RATE = 32000;
export const DEFAULT_BITRATE = 128000;
export const DEFAULT_CHANNEL = 1;
export const DEFAULT_ENGLISH_NORMALIZATION = false;
export const MINIMAX_TEXT_CHUNK_LIMIT = 4000;

export const MINIMAX_MODELS: readonly MinimaxTTSModel[] = [
  "speech-2.8-hd",
  "speech-2.8-turbo",
  "speech-2.6-hd",
  "speech-2.6-turbo",
  "speech-02-hd",
  "speech-02-turbo",
];

export const MODEL_LABELS: Record<MinimaxTTSModel, string> = {
  "speech-2.8-hd": "Speech 2.8 HD · expressive",
  "speech-2.8-turbo": "Speech 2.8 Turbo · low latency",
  "speech-2.6-hd": "Speech 2.6 HD",
  "speech-2.6-turbo": "Speech 2.6 Turbo",
  "speech-02-hd": "Speech 02 HD · fidelity",
  "speech-02-turbo": "Speech 02 Turbo · multilingual",
};

export const MINIMAX_LANGUAGE_BOOSTS: readonly MinimaxLanguageBoost[] = [
  "auto",
  "Chinese",
  "Chinese,Yue",
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Japanese",
  "Korean",
  "Italian",
  "Russian",
  "Arabic",
  "Turkish",
  "Dutch",
  "Ukrainian",
  "Vietnamese",
  "Indonesian",
  "Thai",
  "Polish",
  "Romanian",
  "Greek",
  "Czech",
  "Finnish",
  "Hindi",
];

export const LANGUAGE_BOOST_LABELS: Record<MinimaxLanguageBoost, string> = {
  auto: "Auto",
  Chinese: "Chinese · 中文普通话",
  "Chinese,Yue": "Cantonese · 粤语",
  English: "English",
  Spanish: "Spanish · Español",
  French: "French · Français",
  Portuguese: "Portuguese · Português",
  German: "German · Deutsch",
  Japanese: "Japanese · 日本語",
  Korean: "Korean · 한국어",
  Italian: "Italian · Italiano",
  Russian: "Russian · Русский",
  Arabic: "Arabic · العربية",
  Turkish: "Turkish · Türkçe",
  Dutch: "Dutch · Nederlands",
  Ukrainian: "Ukrainian · Українська",
  Vietnamese: "Vietnamese · Tiếng Việt",
  Indonesian: "Indonesian · Bahasa",
  Thai: "Thai · ไทย",
  Polish: "Polish · Polski",
  Romanian: "Romanian · Română",
  Greek: "Greek · Ελληνικά",
  Czech: "Czech · Čeština",
  Finnish: "Finnish · Suomi",
  Hindi: "Hindi · हिन्दी",
};

const ALL_MODELS: MinimaxTTSModel[] = [...MINIMAX_MODELS];

export const VOICE_CATEGORIES = ["中文普通话", "粤语", "English", "German", "Japanese", "Korean"] as const;

export type MinimaxVoiceCategory = (typeof VOICE_CATEGORIES)[number];

const CATEGORY_LANGUAGE: Record<MinimaxVoiceCategory, string> = {
  中文普通话: "Mandarin Chinese",
  粤语: "Cantonese",
  English: "English",
  German: "German",
  Japanese: "Japanese",
  Korean: "Korean",
};

const CATEGORY_SEARCH_ALIASES: Record<MinimaxVoiceCategory, string[]> = {
  中文普通话: ["中文", "普通话", "汉语", "国语", "Chinese", "Mandarin", "zh", "zh-CN", "cn"],
  粤语: ["粤语", "广东话", "Cantonese", "Yue", "Chinese,Yue", "zh-HK", "zh-Yue"],
  English: ["英语", "英文", "English", "American English", "en", "en-US"],
  German: ["德语", "德文", "German", "Deutsch", "de", "de-DE"],
  Japanese: ["日语", "日文", "Japanese", "ja", "ja-JP"],
  Korean: ["韩语", "韩文", "Korean", "ko", "ko-KR"],
};

export const VOICES: VoiceConfig[] = [
  // 中文普通话 (Mandarin Chinese) — curated reading-focused subset
  voice(
    "Chinese (Mandarin)_Radio_Host",
    "电台男主播",
    "male",
    "中文普通话",
    "有温度、节奏松弛的男声，适合论文、书稿和长时间导览型听书。",
    true,
  ),
  voice(
    "Chinese (Mandarin)_Sincere_Adult",
    "真诚青年",
    "male",
    "中文普通话",
    "真诚稳重、同辈聊天感强，适合论文讲解和评注式阅读。",
  ),
  voice(
    "Chinese (Mandarin)_Gentleman",
    "温润男声",
    "male",
    "中文普通话",
    "温润耐心、有书卷气，适合导师讲解感的长文阅读。",
  ),
  voice(
    "Chinese (Mandarin)_Gentle_Youth",
    "温润青年",
    "male",
    "中文普通话",
    "年轻温和的男声，适合自然、低压力的材料阅读。",
  ),
  voice(
    "Chinese (Mandarin)_Lyrical_Voice",
    "抒情男声",
    "male",
    "中文普通话",
    "柔和抒情的男声，适合散文化论文、随笔和讲稿。",
  ),
  voice("male-qn-jingying", "精英青年", "male", "中文普通话", "专业清晰的青年男声，比高管音色更年轻、有同辈感。"),
  voice(
    "Chinese (Mandarin)_Wise_Women",
    "阅历姐姐",
    "female",
    "中文普通话",
    "知性娓娓的女性声音，适合前辈引路式的论文听读。",
  ),
  voice(
    "Chinese (Mandarin)_Gentle_Senior",
    "温柔学姐",
    "female",
    "中文普通话",
    "温婉柔和、娓娓道来且亲切有感染力的女性声音，适合书与小说、纪录片和论文随听。",
  ),
  voice(
    "Chinese (Mandarin)_Warm_Bestie",
    "温暖闺蜜",
    "female",
    "中文普通话",
    "温柔清亮、舒缓且充满关切的年轻女声，亲切自然，适合疗愈感听读。",
  ),
  voice(
    "Chinese (Mandarin)_Reliable_Executive",
    "沉稳高管",
    "male",
    "中文普通话",
    "沉稳可靠的中年男性声音，适合正式材料和政策文本。",
  ),
  voice(
    "Chinese (Mandarin)_News_Anchor",
    "新闻女声",
    "female",
    "中文普通话",
    "专业播音腔女声，适合朗读新闻、论文和正式材料。",
  ),
  voice(
    "Chinese (Mandarin)_Male_Announcer",
    "播报男声",
    "male",
    "中文普通话",
    "富有磁性的中年男性播报员声音，适合庄重文本。",
  ),
  voice(
    "Chinese (Mandarin)_Crisp_Girl",
    "清脆少女",
    "female",
    "中文普通话",
    "清亮、富有表现力且朝气蓬勃的年轻女声，适合轻松文章、笔记和更活泼的短段落听读。",
  ),

  // 粤语 (Cantonese)
  voice(
    "Cantonese_ProfessionalHost（F)",
    "专业女主持",
    "female",
    "粤语",
    "Professional Cantonese female host voice, suited for news, presentation, and formal reading.",
  ),
  voice(
    "Cantonese_ProfessionalHost（M)",
    "专业男主持",
    "male",
    "粤语",
    "Professional Cantonese male host voice with steady delivery.",
  ),
  voice(
    "Cantonese_GentleLady",
    "温柔女声",
    "female",
    "粤语",
    "Gentle Cantonese female voice for narrative and conversational reading.",
  ),

  // English
  voice(
    "English_Trustworthy_Man",
    "Trustworthy Man",
    "male",
    "English",
    "Grounded, dependable American English male voice for documentaries, briefings, and long-form reading.",
    true,
  ),
  voice(
    "English_Graceful_Lady",
    "Graceful Lady",
    "female",
    "English",
    "Composed, articulate English female voice for audiobooks and policy reading.",
  ),
  voice(
    "English_Diligent_Man",
    "Diligent Man",
    "male",
    "English",
    "Studious, focused English male voice for technical and academic reading.",
  ),
  voice(
    "English_Gentle-voiced_man",
    "Gentle-voiced Man",
    "male",
    "English",
    "Soft, warm English male voice for narrative and calm content.",
  ),
  voice(
    "English_Aussie_Bloke",
    "Aussie Bloke",
    "male",
    "English",
    "Friendly Australian English male voice for casual narration.",
  ),
  voice(
    "English_Whispering_girl",
    "Whispering Girl",
    "female",
    "English",
    "Intimate, breathy English female voice for ASMR-style reading.",
  ),
  voice(
    "Serene_Woman",
    "Serene Woman",
    "female",
    "English",
    "Calm, clear American English female voice for meditation, documentaries, and education.",
  ),

  // German
  voice(
    "German_FriendlyMan",
    "Friendly Man",
    "male",
    "German",
    "轻松自然、真诚友好的德语男声，适合德语文章、对话和长段落听读。",
  ),
  voice(
    "German_SweetLady",
    "Sweet Lady",
    "female",
    "German",
    "灵动甜美的德语青年女声，适合自然轻快的德语短文、对话和日常听读。",
  ),
  voice(
    "German_PlayfulMan",
    "Playful Man",
    "male",
    "German",
    "自然清亮、轻快流畅的德语青年男声，适合亲密交谈感的德语听读。",
  ),

  // Japanese
  voice(
    "Japanese_IntellectualSenior",
    "Intellectual Senior",
    "male",
    "Japanese",
    "知性で落ち着いた日本語男性ボイス。論文・解説・ドキュメンタリーに。",
  ),
  voice("Japanese_KindLady", "Kind Lady", "female", "Japanese", "優しく丁寧な日本語女性ボイス。ナレーションと会話に。"),
  voice(
    "Japanese_CalmLady",
    "Calm Lady",
    "female",
    "Japanese",
    "落ち着いたトーンの日本語女性ボイス。長文の読み上げに最適。",
  ),

  // Korean
  voice(
    "Korean_CalmLady",
    "Calm Lady",
    "female",
    "Korean",
    "차분하고 명료한 한국어 여성 음성. 다큐멘터리와 학술 자료 낭독에 적합.",
  ),
  voice(
    "Korean_CalmGentleman",
    "Calm Gentleman",
    "male",
    "Korean",
    "안정적이고 신뢰감 있는 한국어 남성 음성. 뉴스와 정책 낭독에 적합.",
  ),
];

export function getVoicesByCategory(category: string, model?: MinimaxTTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.category === category && (!model || voice.models.includes(model)));
}

export function getVoicesForModel(model: MinimaxTTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.models.includes(model));
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return VOICES.find((voice) => voice.id === id);
}

export function isVoiceAvailableForModel(voice: VoiceConfig, model: MinimaxTTSModel): boolean {
  return voice.models.includes(model);
}

export function getVoiceSearchKeywords(voice: VoiceConfig): string[] {
  const categoryAliases = CATEGORY_SEARCH_ALIASES[voice.category as MinimaxVoiceCategory] ?? [];
  return Array.from(
    new Set(
      [
        voice.id,
        voice.name,
        voice.category,
        voice.language,
        voice.description,
        ...voice.models,
        ...voice.models.map((model) => MODEL_LABELS[model]),
        ...categoryAliases,
        "minimax",
        "speech",
      ]
        .flatMap((value) => value.split(/[\s,，:：·-]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeMinimaxBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim() || DEFAULT_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

function voice(
  id: string,
  name: string,
  gender: VoiceConfig["gender"],
  category: MinimaxVoiceCategory,
  description: string,
  recommended = false,
): VoiceConfig {
  return {
    id,
    name,
    gender,
    category,
    description,
    language: CATEGORY_LANGUAGE[category],
    models: [...ALL_MODELS],
    recommended,
  };
}
