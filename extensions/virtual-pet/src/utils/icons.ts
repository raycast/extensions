import { Icon as RaycastIcon } from "@raycast/api";

enum CustomIcon {
  Sleep = "icons/zzz.svg",
  MoodSadDizzy = "icons/mood-sad-dizzy.svg",
  MoodSad = "icons/mood-sad.svg",
  MoodConfused = "icons/mood-confused.svg",
  MoodSmile = "icons/mood-smile.svg",
  MoodSmileBeam = "icons/mood-smile-beam.svg",
}

export const Icon = { ...RaycastIcon, ...CustomIcon };
