import { Icon } from "@raycast/api";
import type { VoiceConfig } from "../api/mimo-types";

export function voiceGenderIcon(gender: string) {
  if (gender === "female") return Icon.Female;
  if (gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
}

export function voiceIcon(voice: VoiceConfig) {
  return voiceGenderIcon(voice.gender);
}
