import { Color, Icon, Image } from "@raycast/api";
import type { ProjectType } from "../types";

/**
 * Maps a project type to a Raycast icon + tint. Falls back to a generic
 * folder glyph for user-registered custom types that have no explicit entry.
 */
const ICON_MAP: Record<string, Image.ImageLike> = {
  xcode: { source: Icon.Hammer, tintColor: Color.Blue },
  "swift-package": { source: Icon.Box, tintColor: Color.Orange },
  "android-gradle": { source: Icon.Mobile, tintColor: Color.Green },
  "kotlin-gradle": { source: Icon.Mobile, tintColor: Color.Purple },
  node: { source: Icon.Terminal, tintColor: Color.Green },
  typescript: { source: Icon.Code, tintColor: Color.Blue },
  python: { source: Icon.Snippets, tintColor: Color.Yellow },
  rust: { source: Icon.Cog, tintColor: Color.Red },
  go: { source: Icon.Bolt, tintColor: Color.Blue },
  "java-maven": { source: Icon.Mug, tintColor: Color.Red },
  flutter: { source: Icon.Layers, tintColor: Color.Blue },
  ruby: { source: Icon.Raindrop, tintColor: Color.Red },
  generic: { source: Icon.Folder, tintColor: Color.SecondaryText },
};

export function iconForProjectType(type: ProjectType): Image.ImageLike {
  return ICON_MAP[type] ?? { source: Icon.Folder, tintColor: Color.SecondaryText };
}

export function labelForProjectType(type: ProjectType, fallbackLabel: string): string {
  return fallbackLabel || type;
}
