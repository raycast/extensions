export interface Library {
  id: string;
  path: string;
  console: string;
  core: string;
}

export interface Game {
  id: string;
  name: string;
  path: string;
  console: string;
  libraryId: string;
  core: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  badgeUrl: string;
  earned: boolean;
  dateEarned?: string;
  earnedHardcore: boolean;
  points: number;
  numAwarded: number;
  numAwardedHardcore: number;
  gameId?: number;
}

export interface AchievementData {
  total: number;
  earned: number;
  totalPoints: number;
  earnedPoints: number;
  developer?: string;
  publisher?: string;
  genre?: string;
  achievements: Achievement[];
  gameId: number;
}

export const PLATFORMS = {
  // ARCADE & SNK
  ARCADE: "ARCADE",
  MAME: "MAME",
  FBNEO: "FBNEO",
  CPS1: "CPS1",
  CPS2: "CPS2",
  CPS3: "CPS3",
  NEOGEO: "NEOGEO",
  NEOGEO_CD: "NEOGEO_CD",
  NEOGEO_POCKET: "NEOGEO_POCKET",
  ATOMISWAVE: "ATOMISWAVE",
  NAOMI: "NAOMI",

  // NINTENDO
  NES: "NES",
  FDS: "FDS",
  SNES: "SNES",
  N64: "N64",
  GAMECUBE: "GAMECUBE",
  WII: "WII",
  GB: "GB",
  GBC: "GBC",
  GBA: "GBA",
  NDS: "NDS",
  "3DS": "3DS",
  VIRTUAL_BOY: "VIRTUAL_BOY",
  POKEMON_MINI: "POKEMON_MINI",

  // SONY
  PS1: "PS1",
  PS2: "PS2",
  PSP: "PSP",

  // SEGA
  SG1000: "SG1000",
  MASTER_SYSTEM: "MASTER_SYSTEM",
  GENESIS: "GENESIS",
  GAME_GEAR: "GAME_GEAR",
  SEGA_CD: "SEGA_CD",
  SEGA_32X: "SEGA_32X",
  SATURN: "SATURN",
  DREAMCAST: "DREAMCAST",

  // ATARI
  ATARI_2600: "ATARI_2600",
  ATARI_5200: "ATARI_5200",
  ATARI_7800: "ATARI_7800",
  LYNX: "LYNX",
  JAGUAR: "JAGUAR",
  ATARI_ST: "ATARI_ST",

  // OTHERS & COMPUTERS
  COMMODORE_64: "COMMODORE_64",
  COMMODORE_128: "COMMODORE_128",
  VIC20: "VIC20",
  AMIGA: "AMIGA",
  PC_ENGINE: "PC_ENGINE",
  PC_ENGINE_CD: "PC_ENGINE_CD",
  SUPERGRAFX: "SUPERGRAFX",
  PC_FX: "PC_FX",
  MSX: "MSX",
  X68000: "X68000",
  "3DO": "3DO",
  WONDERSWAN: "WONDERSWAN",
  INTELLIVISION: "INTELLIVISION",
  COLECOVISION: "COLECOVISION",
  ODYSSEY2: "ODYSSEY2",
  ZX_SPECTRUM: "ZX_SPECTRUM",
  AMSTRAD_CPC: "AMSTRAD_CPC",
  DOS: "DOS",
  SCUMMVM: "SCUMMVM",
  PICO8: "PICO8",
  TIC80: "TIC80",
  CHIP8: "CHIP8",
  SUPERVISION: "SUPERVISION",
  VECTREX: "VECTREX",
  ARCADIA_2001: "ARCADIA_2001",

  // STANDALONE / ENGINES
  DINOTHAWR: "DINOTHAWR",
  DOOM: "DOOM",
  QUAKE: "QUAKE",
  CAVE_STORY: "CAVE_STORY",
  MRBOOM: "MRBOOM",
  CANNONBALL: "CANNONBALL",
} as const;

export const ARCADE_SYSTEMS: readonly string[] = [
  PLATFORMS.ARCADE,
  PLATFORMS.FBNEO,
  PLATFORMS.MAME,
  PLATFORMS.CPS1,
  PLATFORMS.CPS2,
  PLATFORMS.CPS3,
  PLATFORMS.NEOGEO,
  PLATFORMS.NEOGEO_CD,
  PLATFORMS.ATOMISWAVE,
  PLATFORMS.NAOMI,
];
