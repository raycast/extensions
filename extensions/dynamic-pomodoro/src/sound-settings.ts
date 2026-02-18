export type SystemCompletionSound = {
  id: string;
  title: string;
  path: string;
};

export const SYSTEM_COMPLETION_SOUNDS: SystemCompletionSound[] = [
  {
    id: "unfold-encore-infinitum",
    title: "Раскрытие (Unfold)",
    path: "/System/Library/PrivateFrameworks/ToneLibrary.framework/Versions/A/Resources/Ringtones/Unfold-EncoreInfinitum.m4r",
  },
  { id: "hero", title: "Hero", path: "/System/Library/Sounds/Hero.aiff" },
  { id: "ping", title: "Ping", path: "/System/Library/Sounds/Ping.aiff" },
  { id: "glass", title: "Glass", path: "/System/Library/Sounds/Glass.aiff" },
  { id: "pop", title: "Pop", path: "/System/Library/Sounds/Pop.aiff" },
  { id: "tink", title: "Tink", path: "/System/Library/Sounds/Tink.aiff" },
  { id: "basso", title: "Basso", path: "/System/Library/Sounds/Basso.aiff" },
  { id: "submarine", title: "Submarine", path: "/System/Library/Sounds/Submarine.aiff" },
  { id: "frog", title: "Frog", path: "/System/Library/Sounds/Frog.aiff" },
  { id: "morse", title: "Morse", path: "/System/Library/Sounds/Morse.aiff" },
  { id: "sosumi", title: "Sosumi", path: "/System/Library/Sounds/Sosumi.aiff" },
];

export function getSystemSoundById(soundId: string | undefined): SystemCompletionSound | undefined {
  if (!soundId) {
    return undefined;
  }

  return SYSTEM_COMPLETION_SOUNDS.find((sound) => sound.id === soundId);
}
