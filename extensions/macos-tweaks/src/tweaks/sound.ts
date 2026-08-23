import type { TweakDefinition } from "../types";

export const soundTweaks: TweakDefinition[] = [
  {
    id: "sound-ui-sounds",
    title: "User Interface Sound Effects",
    description: 'Play sound effects for UI events like emptying Trash, screenshots, and the "drag to Dock" feedback',
    category: "sound",
    domain: "NSGlobalDomain",
    key: "com.apple.sound.uiaudio.enabled",
    type: "boolean",
    defaultValue: true,
    risk: "safe",
    tags: ["ui", "sound effects"],
  },
  {
    id: "sound-volume-feedback",
    title: "Volume Change Feedback Sound",
    description: "Play the feedback beep when changing the system volume with the keyboard",
    category: "sound",
    domain: "NSGlobalDomain",
    key: "com.apple.sound.beep.feedback",
    type: "boolean",
    defaultValue: true,
    risk: "safe",
    tags: ["volume", "beep", "feedback"],
  },
];
