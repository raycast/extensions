export type SoundCategory = "nature" | "urban" | "electronic" | "binaural";

export interface SoundDefinition {
  id: string;
  name: string;
  category: SoundCategory;
  fileName: string;
  icon: string;
  description: string;
}

export interface ActiveSound {
  soundId: string;
  volume: number; // 0-100
}

export interface PlaybackState {
  isPlaying: boolean;
  activeSounds: ActiveSound[];
  masterVolume: number; // 0-100
}

export interface PidEntry {
  soundId: string;
  pid: number;
  volume: number;
  startedAt: number;
}

export interface PidRegistry {
  entries: PidEntry[];
  lastUpdated: number;
}

export interface Preset {
  id: string;
  name: string;
  sounds: ActiveSound[];
  masterVolume: number;
  createdAt: number;
  updatedAt: number;
}

export interface TimerState {
  enabled: boolean;
  durationMinutes: number;
  startedAt: number | null;
  endsAt: number | null;
}
