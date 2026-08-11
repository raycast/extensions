import { environment } from "@raycast/api";
import path from "path";
import type { SoundCategory, SoundDefinition } from "../types";

export const SOUND_CATEGORIES: { id: SoundCategory; name: string; icon: string }[] = [
  { id: "nature", name: "Nature", icon: "tree" },
  { id: "urban", name: "Urban", icon: "building" },
  { id: "electronic", name: "Electronic", icon: "waveform" },
  { id: "binaural", name: "Binaural", icon: "brain" },
];

export const SOUNDS: SoundDefinition[] = [
  // Nature
  {
    id: "rain",
    name: "Rain",
    category: "nature",
    fileName: "rain.m4a",
    icon: "cloud-rain",
    description: "Gentle rainfall on a quiet day",
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    category: "nature",
    fileName: "thunderstorm.m4a",
    icon: "cloud-lightning",
    description: "Distant thunder with heavy rain",
  },
  {
    id: "ocean-waves",
    name: "Ocean Waves",
    category: "nature",
    fileName: "ocean-waves.m4a",
    icon: "water",
    description: "Waves rolling onto the shore",
  },
  {
    id: "river-stream",
    name: "River Stream",
    category: "nature",
    fileName: "river-stream.m4a",
    icon: "drop",
    description: "Babbling brook flowing over rocks",
  },
  {
    id: "wind",
    name: "Wind",
    category: "nature",
    fileName: "wind.m4a",
    icon: "wind",
    description: "Soft breeze through the trees",
  },
  {
    id: "birds",
    name: "Birds",
    category: "nature",
    fileName: "birds.m4a",
    icon: "bird",
    description: "Morning birdsong in the forest",
  },
  {
    id: "summer-night",
    name: "Summer Night",
    category: "nature",
    fileName: "summer-night.m4a",
    icon: "moon",
    description: "Crickets and gentle night sounds",
  },
  {
    id: "campfire",
    name: "Campfire",
    category: "nature",
    fileName: "campfire.m4a",
    icon: "fire",
    description: "Crackling campfire under the stars",
  },
  {
    id: "forest",
    name: "Forest",
    category: "nature",
    fileName: "forest.m4a",
    icon: "tree",
    description: "Deep forest ambience with rustling leaves",
  },

  // Urban
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    category: "urban",
    fileName: "coffee-shop.m4a",
    icon: "mug",
    description: "Cozy cafe with quiet chatter",
  },
  {
    id: "city-street",
    name: "City Street",
    category: "urban",
    fileName: "city-street.m4a",
    icon: "car",
    description: "Distant city traffic and footsteps",
  },
  {
    id: "train",
    name: "Train",
    category: "urban",
    fileName: "train.m4a",
    icon: "train",
    description: "Rhythmic train on the tracks",
  },
  {
    id: "keyboard-typing",
    name: "Keyboard Typing",
    category: "urban",
    fileName: "keyboard-typing.m4a",
    icon: "keyboard",
    description: "Mechanical keyboard clicks",
  },
  {
    id: "clock-ticking",
    name: "Clock Ticking",
    category: "urban",
    fileName: "clock-ticking.m4a",
    icon: "clock",
    description: "Steady clock tick-tock",
  },

  // Electronic
  {
    id: "white-noise",
    name: "White Noise",
    category: "electronic",
    fileName: "white-noise.m4a",
    icon: "signal",
    description: "Even static across all frequencies",
  },
  {
    id: "pink-noise",
    name: "Pink Noise",
    category: "electronic",
    fileName: "pink-noise.m4a",
    icon: "signal",
    description: "Balanced noise, like a waterfall",
  },
  {
    id: "brown-noise",
    name: "Brown Noise",
    category: "electronic",
    fileName: "brown-noise.m4a",
    icon: "signal",
    description: "Deep rumble, like strong wind",
  },
  {
    id: "deep-space",
    name: "Deep Space",
    category: "electronic",
    fileName: "deep-space.m4a",
    icon: "stars",
    description: "Cosmic drone and ethereal tones",
  },

  // Binaural
  {
    id: "alpha-waves",
    name: "Alpha Waves",
    category: "binaural",
    fileName: "alpha-waves.m4a",
    icon: "waveform",
    description: "8-12Hz for relaxed focus",
  },
  {
    id: "beta-waves",
    name: "Beta Waves",
    category: "binaural",
    fileName: "beta-waves.m4a",
    icon: "waveform",
    description: "12-30Hz for active concentration",
  },
  {
    id: "theta-waves",
    name: "Theta Waves",
    category: "binaural",
    fileName: "theta-waves.m4a",
    icon: "waveform",
    description: "4-8Hz for deep meditation",
  },
  {
    id: "delta-waves",
    name: "Delta Waves",
    category: "binaural",
    fileName: "delta-waves.m4a",
    icon: "waveform",
    description: "0.5-4Hz for deep sleep",
  },
];

export function getSoundFilePath(sound: SoundDefinition): string {
  return path.join(environment.assetsPath, "sounds", sound.fileName);
}

export function getSoundById(id: string): SoundDefinition | undefined {
  return SOUNDS.find((s) => s.id === id);
}

export function getSoundsByCategory(category: SoundCategory): SoundDefinition[] {
  return SOUNDS.filter((s) => s.category === category);
}
