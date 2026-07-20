import type { VoiceConfig } from "../api/types";

export const DEFAULT_VOICE_ID = "Sadaltager";
export const ACADEMIC_RECOMMENDED_VOICE_IDS = new Set(["Sadaltager", "Charon", "Rasalgethi", "Iapetus"]);

export const GEMINI_VOICES: VoiceConfig[] = [
  { id: "Sadaltager", name: "Sadaltager", category: "Academic", description: "Knowledgeable" },
  { id: "Charon", name: "Charon", category: "Academic", description: "Informative" },
  { id: "Rasalgethi", name: "Rasalgethi", category: "Academic", description: "Informative" },
  { id: "Iapetus", name: "Iapetus", category: "Academic", description: "Clear" },
  { id: "Erinome", name: "Erinome", category: "Academic", description: "Clear" },
  { id: "Schedar", name: "Schedar", category: "Narration", description: "Even" },
  { id: "Algieba", name: "Algieba", category: "Narration", description: "Smooth" },
  { id: "Despina", name: "Despina", category: "Narration", description: "Smooth" },
  { id: "Vindemiatrix", name: "Vindemiatrix", category: "Narration", description: "Gentle" },
  { id: "Sulafat", name: "Sulafat", category: "Narration", description: "Warm" },
  { id: "Kore", name: "Kore", category: "Firm", description: "Firm" },
  { id: "Orus", name: "Orus", category: "Firm", description: "Firm" },
  { id: "Alnilam", name: "Alnilam", category: "Firm", description: "Firm" },
  { id: "Zephyr", name: "Zephyr", category: "Bright", description: "Bright" },
  { id: "Autonoe", name: "Autonoe", category: "Bright", description: "Bright" },
  { id: "Puck", name: "Puck", category: "Conversational", description: "Upbeat" },
  { id: "Laomedeia", name: "Laomedeia", category: "Conversational", description: "Upbeat" },
  { id: "Achird", name: "Achird", category: "Conversational", description: "Friendly" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", category: "Conversational", description: "Casual" },
  { id: "Callirrhoe", name: "Callirrhoe", category: "Conversational", description: "Easy-going" },
  { id: "Umbriel", name: "Umbriel", category: "Conversational", description: "Easy-going" },
  { id: "Aoede", name: "Aoede", category: "Expressive", description: "Breezy" },
  { id: "Fenrir", name: "Fenrir", category: "Expressive", description: "Excitable" },
  { id: "Sadachbia", name: "Sadachbia", category: "Expressive", description: "Lively" },
  { id: "Pulcherrima", name: "Pulcherrima", category: "Expressive", description: "Forward" },
  { id: "Leda", name: "Leda", category: "Character", description: "Youthful" },
  { id: "Enceladus", name: "Enceladus", category: "Character", description: "Breathy" },
  { id: "Algenib", name: "Algenib", category: "Character", description: "Gravelly" },
  { id: "Gacrux", name: "Gacrux", category: "Character", description: "Mature" },
  { id: "Achernar", name: "Achernar", category: "Character", description: "Soft" },
].map((voice) => ({ ...voice, gender: "unknown" }));

export const FALLBACK_VOICES = GEMINI_VOICES;

export function getVoiceById(id: string): VoiceConfig | undefined {
  return GEMINI_VOICES.find((voice) => voice.id === id);
}

export function isAcademicRecommendedVoice(id: string): boolean {
  return ACADEMIC_RECOMMENDED_VOICE_IDS.has(id);
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
