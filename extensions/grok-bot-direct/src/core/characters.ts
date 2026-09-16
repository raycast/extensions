/** Character identities follow the deterministic desktop 0.43.0 mapping. */
const DEFAULT_SHAPES = [
  "blob",
  "pebble",
  "squircle",
  "tablet",
  "wedge",
  "hex",
  "cloud",
  "teardrop",
];
const SHAPES = new Set([
  ...DEFAULT_SHAPES,
  "bean",
  "egg",
  "capsule",
  "cylinder",
  "gem",
  "crystal",
  "shield",
  "dome",
  "arch",
  "leaf",
]);
const COLORS = [
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "violet",
  "magenta",
  "gray",
];
export interface Character {
  id: string;
  avatarShape: string | null;
  avatarColor: string | null;
}

export function characterIdentity(bot: Character): {
  shape: string;
  color: string;
} {
  let hash = 2166136261;
  for (let index = 0; index < bot.id.length; index++)
    hash = Math.imul(hash ^ bot.id.charCodeAt(index), 16777619);
  let mixed = Math.imul(hash ^ (hash >>> 16), 73244475);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 3266489909);
  const shape =
    bot.avatarShape && SHAPES.has(bot.avatarShape)
      ? bot.avatarShape
      : DEFAULT_SHAPES[
          ((mixed ^ (mixed >>> 16)) >>> 0) % DEFAULT_SHAPES.length
        ];
  // Desktop uses the first Mulberry32 sample seeded with the bot ID's FNV-1a hash.
  const seed = (hash + 1831565813) | 0;
  let random = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  random = (random + Math.imul(random ^ (random >>> 7), 61 | random)) ^ random;
  const color =
    bot.avatarColor &&
    (bot.avatarColor === "black" || COLORS.includes(bot.avatarColor))
      ? bot.avatarColor
      : COLORS[
          Math.floor(
            (((random ^ (random >>> 14)) >>> 0) / 4294967296) * COLORS.length,
          )
        ];
  return { shape, color };
}
export function characterSources(bot: Character): {
  light: string;
  dark: string;
} {
  const { shape, color } = characterIdentity(bot);
  return {
    light: `characters/${shape}-${color}-light.svg`,
    dark: `characters/${shape}-${color}-dark.svg`,
  };
}

export function resolveCharacterImage(
  bot: Character & { avatarDataUrl?: string | null },
  directory: string,
  exists: (path: string) => boolean,
): { source?: string | { light: string; dark: string }; color: string } {
  const { color } = characterIdentity(bot);
  const colors: Record<string, string> = {
    black: "#777777",
    brown: "#A27952",
    red: "#FF3E51",
    orange: "#FF781C",
    yellow: "#FFAF38",
    green: "#00C972",
    cyan: "#1CC3B0",
    blue: "#2A92FE",
    violet: "#A97EFE",
    magenta: "#FF5EB1",
    gray: "#959595",
  };
  const tint = colors[color];
  if (
    bot.avatarDataUrl &&
    bot.avatarDataUrl.length <= 4 * 1024 * 1024 &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
      bot.avatarDataUrl,
    )
  )
    return { source: bot.avatarDataUrl, color: tint };
  const relative = characterSources(bot);
  const source = {
    light: `${directory}/${relative.light}`,
    dark: `${directory}/${relative.dark}`,
  };
  return exists(source.light) && exists(source.dark)
    ? { source, color: tint }
    : { color: tint };
}
