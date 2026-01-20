import { Icon } from "@raycast/api";

/**
 * Arena interface
 */
export interface Arena {
  id: string;
  name: string;
  icon: Icon;
}

/**
 * Static hashmap of arenas grouped by sections
 */
export const ARENAS_BY_SECTION = new Map<string, Arena[]>([
  ["Chat Arena", [{ id: "chat-arena", name: "Chat Arena", icon: Icon.Message }]],
  [
    "Coding Arena",
    [
      { id: "text-to-website", name: "Website", icon: Icon.Globe },
      { id: "threejs", name: "3D", icon: Icon.Box },
      { id: "text-to-game", name: "Game", icon: Icon.GameController },
      { id: "p5-animation", name: "Animation", icon: Icon.Brush },
      { id: "text-to-svg", name: "Text to SVG", icon: Icon.Code },
      { id: "dataviz", name: "Data Visualization", icon: Icon.BarChart },
      { id: "tonejs", name: "MIDI", icon: Icon.Livestream },
    ],
  ],
  [
    "Image Arena",
    [
      { id: "text-to-image", name: "Text to Image", icon: Icon.Wand },
      { id: "image-to-image", name: "Image to Image", icon: Icon.Image },
    ],
  ],
  [
    "Video Arena",
    [
      { id: "text-to-video", name: "Text to Image", icon: Icon.Wand },
      { id: "image-to-video", name: "Image to Video", icon: Icon.Image },
      { id: "video-editing", name: "Video Editing", icon: Icon.FilmStrip },
    ],
  ],
  [
    "Audio Arena",
    [
      { id: "text-to-speech", name: "Text to Speech", icon: Icon.SpeakerHigh },
      { id: "music", name: "Text to Music", icon: Icon.Music },
    ],
  ],
  ["Trading Arena", [{ id: "stock-arena", name: "Stocks Arena", icon: Icon.LineChart }]],
]);

/**
 * Gets arena by its ID
 * @param arenaId - The arena ID
 * @returns Arena object if found, undefined otherwise
 */
export function getArenaById(arenaId: string): Arena | undefined {
  for (const [, arenas] of ARENAS_BY_SECTION) {
    const arena = arenas.find((a) => a.id === arenaId);
    if (arena) {
      return arena;
    }
  }
  return undefined;
}

/**
 * Gets icon for an arena by its ID
 * @param arenaId - The arena ID
 * @returns Icon with fallback to Icon.Star
 */
export function getArenaIcon(arenaId: string): Icon {
  const arena = getArenaById(arenaId);
  return arena?.icon || Icon.Star;
}
