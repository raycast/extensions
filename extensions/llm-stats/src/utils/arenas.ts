import { Icon } from "@raycast/api";

/**
 * Arena interface
 */
export interface Arena {
  id: string;
  name: string;
  icon: Icon;
  link: string;
}

/**
 * Static hashmap of arenas grouped by sections
 */
export const ARENAS_BY_SECTION = new Map<string, Arena[]>([
  [
    "Chat Arena",
    [{ id: "chat-arena", name: "Chat", icon: Icon.Message, link: "https://llm-stats.com/arenas/llm-arena/chat-arena" }],
  ],
  [
    "Coding Arena",
    [
      {
        id: "text-to-website",
        name: "Website",
        icon: Icon.Globe,
        link: "https://llm-stats.com/arenas/coding-arena/text-to-website",
      },
      { id: "threejs", name: "3D", icon: Icon.Box, link: "https://llm-stats.com/arenas/coding-arena/threejs" },
      {
        id: "text-to-game",
        name: "Game",
        icon: Icon.GameController,
        link: "https://llm-stats.com/arenas/coding-arena/text-to-game",
      },
      {
        id: "p5-animation",
        name: "Animation",
        icon: Icon.Brush,
        link: "https://llm-stats.com/arenas/coding-arena/p5-animation",
      },
      {
        id: "text-to-svg",
        name: "Text to SVG",
        icon: Icon.Code,
        link: "https://llm-stats.com/arenas/coding-arena/text-to-svg",
      },
      {
        id: "dataviz",
        name: "Data Visualization",
        icon: Icon.BarChart,
        link: "https://llm-stats.com/arenas/coding-arena/dataviz",
      },
      { id: "tonejs", name: "MIDI", icon: Icon.Livestream, link: "https://llm-stats.com/arenas/coding-arena/tonejs" },
    ],
  ],
  [
    "Image Arena",
    [
      {
        id: "text-to-image",
        name: "Text to Image",
        icon: Icon.Wand,
        link: "https://llm-stats.com/arenas/image-arena/text-to-image",
      },
      {
        id: "image-to-image",
        name: "Image to Image",
        icon: Icon.Image,
        link: "https://llm-stats.com/arenas/image-arena/image-to-image",
      },
    ],
  ],
  [
    "Video Arena",
    [
      {
        id: "text-to-video",
        name: "Text to Video",
        icon: Icon.Wand,
        link: "https://llm-stats.com/arenas/video-arena/text-to-video",
      },
      {
        id: "image-to-video",
        name: "Image to Video",
        icon: Icon.Image,
        link: "https://llm-stats.com/arenas/video-arena/image-to-video",
      },
      {
        id: "video-editing",
        name: "Video Editing",
        icon: Icon.FilmStrip,
        link: "https://llm-stats.com/arenas/video-arena/video-editing",
      },
    ],
  ],
  [
    "Audio Arena",
    [
      {
        id: "text-to-speech",
        name: "Text to Speech",
        icon: Icon.SpeakerHigh,
        link: "https://llm-stats.com/arenas/audio-arena/text-to-speech",
      },
      { id: "music", name: "Text to Music", icon: Icon.Music, link: "https://llm-stats.com/arenas/audio-arena/music" },
    ],
  ],
  [
    "Trading Arena",
    [
      {
        id: "stock-arena",
        name: "Stocks",
        icon: Icon.LineChart,
        link: "https://llm-stats.com/arenas/trading-arena",
      },
    ],
  ],
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
