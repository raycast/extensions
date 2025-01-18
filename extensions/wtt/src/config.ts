export interface TimeZoneConfig {
  nickname: string;
  timezone: string;
}

// Common timezone suggestions with emojis
export const SUGGESTIONS: TimeZoneConfig[] = [
  // North America
  { timezone: "America/New_York", nickname: "🗽" },
  { timezone: "America/Los_Angeles", nickname: "🌉" },
  { timezone: "America/Chicago", nickname: "🌭" },
  { timezone: "America/Toronto", nickname: "🍁" },
  { timezone: "America/Vancouver", nickname: "🏔️" },
  { timezone: "America/Mexico_City", nickname: "🌵" },

  // Europe
  { timezone: "Europe/London", nickname: "🇬🇧" },
  { timezone: "Europe/Paris", nickname: "🗼" },
  { timezone: "Europe/Berlin", nickname: "🍺" },
  { timezone: "Europe/Amsterdam", nickname: "🚲" },
  { timezone: "Europe/Rome", nickname: "🍝" },
  { timezone: "Europe/Madrid", nickname: "💃" },
  { timezone: "Europe/Stockholm", nickname: "🎸" },

  // Asia
  { timezone: "Asia/Tokyo", nickname: "🗾" },
  { timezone: "Asia/Singapore", nickname: "🦁" },
  { timezone: "Asia/Dubai", nickname: "🌴" },
  { timezone: "Asia/Shanghai", nickname: "🐉" },
  { timezone: "Asia/Seoul", nickname: "🎮" },
  { timezone: "Asia/Hong_Kong", nickname: "🏮" },
  { timezone: "Asia/Kolkata", nickname: "🪔" },

  // Oceania
  { timezone: "Australia/Sydney", nickname: "🦘" },
  { timezone: "Australia/Melbourne", nickname: "🎾" },
  { timezone: "Pacific/Auckland", nickname: "🥝" },

  // South America
  { timezone: "America/Sao_Paulo", nickname: "⚽" },
  { timezone: "America/Buenos_Aires", nickname: "🧉" },
  { timezone: "America/Santiago", nickname: "🗿" },
] as const;
