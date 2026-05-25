import { Color, Icon } from "@raycast/api";
import { Source } from "./types";

/** Per-source display config: label for chips/tags, icon, accent color. */
export const SOURCE_META: Record<
  Source,
  { label: string; icon: Icon; color: Color }
> = {
  "homebrew-cask": { label: "Homebrew", icon: Icon.Mug, color: Color.Orange },
  "homebrew-formula": {
    label: "Homebrew CLI",
    icon: Icon.Terminal,
    color: Color.Orange,
  },
  mas: { label: "App Store", icon: Icon.Store, color: Color.Blue },
  sparkle: { label: "Sparkle", icon: Icon.Stars, color: Color.Purple },
  electron: { label: "Electron", icon: Icon.Bolt, color: Color.Yellow },
  github: { label: "GitHub", icon: Icon.Code, color: Color.PrimaryText },
  devmate: { label: "DevMate", icon: Icon.Globe, color: Color.SecondaryText },
  npm: { label: "npm", icon: Icon.Globe, color: Color.Red },
  pip: { label: "Python", icon: Icon.Code, color: Color.Green },
  gem: { label: "Ruby", icon: Icon.Star, color: Color.Magenta },
  unknown: {
    label: "Unknown",
    icon: Icon.QuestionMark,
    color: Color.SecondaryText,
  },
};
