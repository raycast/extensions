import { LocalStorage, getPreferenceValues } from "@raycast/api";

const FALLBACK_DATA_URL =
  "https://cdn.jsdelivr.net/gh/Glct26/rom-launcher-db@main/rom-launcher-db.json";
const CACHE_KEY = "db_cache_v1";
const TIME_KEY = "db_last_update_v1";

export interface Metadata {
  systems: Record<
    string,
    { name: string; libretro: string; cores: string[]; extensions: string[] }
  >;
  arcade_names: Record<string, string>;
  arcade_thumbs?: Record<string, string>;
  dos_thumbs?: Record<string, string>;
  raids: Record<string, Record<string, number>>;
}

const LOCAL_SYSTEMS: Record<
  string,
  { name: string; libretro: string; cores: string[]; extensions: string[] }
> = {
  // ARCADE & SNK
  ARCADE: {
    name: "Arcade (MAME)",
    libretro: "MAME",
    cores: [
      "mame_libretro",
      "mame2003_plus_libretro",
      "mame2003_libretro",
      "mame2010_libretro",
      "mame2015_libretro",
      "mame2016_libretro",
      "mame2000_libretro",
    ],
    extensions: [".zip", ".7z", ".chd"],
  },
  FBNEO: {
    name: "Arcade (FinalBurn Neo)",
    libretro: "FBNeo - Arcade Games",
    cores: ["fbneo_libretro", "fbalpha_libretro", "fbalpha2012_libretro"],
    extensions: [".zip", ".7z"],
  },
  CPS1: {
    name: "Capcom CPS-1",
    libretro: "Capcom - CP System I",
    cores: ["fbneo_libretro", "fbalpha_libretro", "mame_libretro"],
    extensions: [".zip"],
  },
  CPS2: {
    name: "Capcom CPS-2",
    libretro: "Capcom - CP System II",
    cores: ["fbneo_libretro", "fbalpha_libretro", "mame_libretro"],
    extensions: [".zip"],
  },
  CPS3: {
    name: "Capcom CPS-3",
    libretro: "Capcom - CP System III",
    cores: ["fbneo_libretro", "fbalpha_libretro", "mame_libretro"],
    extensions: [".zip"],
  },
  NEOGEO: {
    name: "SNK Neo Geo",
    libretro: "SNK - Neo Geo",
    cores: ["fbneo_libretro", "fbalpha_libretro", "mame_libretro"],
    extensions: [".zip"],
  },
  NEOGEO_CD: {
    name: "SNK Neo Geo CD",
    libretro: "SNK - Neo Geo CD",
    cores: ["neocd_libretro", "fbneo_libretro"],
    extensions: [".cue", ".chd"],
  },
  NEOGEO_POCKET: {
    name: "SNK Neo Geo Pocket / Color",
    libretro: "SNK - Neo Geo Pocket Color",
    cores: ["mednafen_ngp_libretro", "race_libretro"],
    extensions: [".ngp", ".ngc", ".ngpc", ".zip"],
  },
  ATOMISWAVE: {
    name: "Sammy Atomiswave",
    libretro: "Sammy - Atomiswave",
    cores: ["flycast_libretro"],
    extensions: [".zip"],
  },
  NAOMI: {
    name: "Sega NAOMI",
    libretro: "Sega - Naomi",
    cores: ["flycast_libretro"],
    extensions: [".zip", ".dat"],
  },

  // NINTENDO
  NES: {
    name: "Nintendo Entertainment System",
    libretro: "Nintendo - Nintendo Entertainment System",
    cores: [
      "fceumm_libretro",
      "mesen_libretro",
      "nestopia_libretro",
      "quicknes_libretro",
    ],
    extensions: [".nes", ".zip"],
  },
  FDS: {
    name: "Famicom Disk System",
    libretro: "Nintendo - Family Computer Disk System",
    cores: ["fceumm_libretro", "mesen_libretro", "nestopia_libretro"],
    extensions: [".fds", ".zip"],
  },
  SNES: {
    name: "Super Nintendo",
    libretro: "Nintendo - Super Nintendo Entertainment System",
    cores: [
      "snes9x_libretro",
      "snes9x_2010_libretro",
      "snes9x_2005_libretro",
      "bsnes_libretro",
      "mesen-s_libretro",
    ],
    extensions: [".sfc", ".smc", ".zip"],
  },
  N64: {
    name: "Nintendo 64",
    libretro: "Nintendo - Nintendo 64",
    cores: ["mupen64plus_next_libretro", "parallel_n64_libretro"],
    extensions: [".n64", ".z64", ".v64", ".zip"],
  },
  GAMECUBE: {
    name: "Nintendo GameCube",
    libretro: "Nintendo - GameCube",
    cores: ["dolphin_libretro"],
    extensions: [".iso", ".rvz", ".gcm", ".ciso"],
  },
  WII: {
    name: "Nintendo Wii",
    libretro: "Nintendo - Wii",
    cores: ["dolphin_libretro"],
    extensions: [".iso", ".rvz", ".wbfs", ".wad"],
  },
  GB: {
    name: "Game Boy",
    libretro: "Nintendo - Game Boy",
    cores: [
      "gambatte_libretro",
      "sameboy_libretro",
      "gearboy_libretro",
      "tgbdual_libretro",
    ],
    extensions: [".gb", ".zip"],
  },
  GBC: {
    name: "Game Boy Color",
    libretro: "Nintendo - Game Boy Color",
    cores: ["gambatte_libretro", "sameboy_libretro", "gearboy_libretro"],
    extensions: [".gbc", ".zip"],
  },
  GBA: {
    name: "Game Boy Advance",
    libretro: "Nintendo - Game Boy Advance",
    cores: [
      "mgba_libretro",
      "vba_next_libretro",
      "gpsp_libretro",
      "vbam_libretro",
    ],
    extensions: [".gba", ".zip"],
  },
  NDS: {
    name: "Nintendo DS",
    libretro: "Nintendo - Nintendo DS",
    cores: ["melonds_libretro", "desmume_libretro", "desmume2015_libretro"],
    extensions: [".nds", ".zip"],
  },
  "3DS": {
    name: "Nintendo 3DS",
    libretro: "Nintendo - Nintendo 3DS",
    cores: ["citra_libretro", "citra_canary_libretro"],
    extensions: [".3ds", ".cci", ".cxi"],
  },
  VIRTUAL_BOY: {
    name: "Virtual Boy",
    libretro: "Nintendo - Virtual Boy",
    cores: ["mednafen_vb_libretro"],
    extensions: [".vb", ".zip"],
  },
  POKEMON_MINI: {
    name: "Pokemon Mini",
    libretro: "Nintendo - Pokemon Mini",
    cores: ["pokemini_libretro"],
    extensions: [".min", ".zip"],
  },

  // SONY
  PS1: {
    name: "PlayStation 1",
    libretro: "Sony - PlayStation",
    cores: [
      "duckstation_libretro",
      "pcsx_rearmed_libretro",
      "swanstation_libretro",
      "mednafen_psx_hw_libretro",
      "beetle_psx_libretro",
    ],
    extensions: [".cue", ".chd", ".pbp", ".iso", ".bin"],
  },
  PS2: {
    name: "PlayStation 2",
    libretro: "Sony - PlayStation 2",
    cores: ["pcsx2_libretro", "play_libretro"],
    extensions: [".iso", ".chd", ".gz"],
  },
  PSP: {
    name: "PlayStation Portable",
    libretro: "Sony - PlayStation Portable",
    cores: ["ppsspp_libretro"],
    extensions: [".iso", ".cso", ".pbp"],
  },

  // SEGA
  SG1000: {
    name: "Sega SG-1000",
    libretro: "Sega - SG-1000",
    cores: ["gearsystem_libretro", "genesis_plus_gx_libretro"],
    extensions: [".sg", ".zip"],
  },
  MASTER_SYSTEM: {
    name: "Sega Master System",
    libretro: "Sega - Master System - Mark III",
    cores: [
      "genesis_plus_gx_libretro",
      "gearsystem_libretro",
      "picodrive_libretro",
    ],
    extensions: [".sms", ".zip"],
  },
  GENESIS: {
    name: "Sega Genesis / Mega Drive",
    libretro: "Sega - Mega Drive - Genesis",
    cores: [
      "genesis_plus_gx_libretro",
      "blastem_libretro",
      "picodrive_libretro",
      "genesis_plus_gx_wide_libretro",
    ],
    extensions: [".md", ".gen", ".bin", ".zip"],
  },
  GAME_GEAR: {
    name: "Sega Game Gear",
    libretro: "Sega - Game Gear",
    cores: ["genesis_plus_gx_libretro", "gearsystem_libretro"],
    extensions: [".gg", ".zip"],
  },
  SEGA_CD: {
    name: "Sega CD / Mega-CD",
    libretro: "Sega - Mega-CD - Sega CD",
    cores: ["genesis_plus_gx_libretro", "picodrive_libretro"],
    extensions: [".cue", ".chd", ".iso"],
  },
  SEGA_32X: {
    name: "Sega 32X",
    libretro: "Sega - 32X",
    cores: ["picodrive_libretro"],
    extensions: [".32x", ".zip"],
  },
  SATURN: {
    name: "Sega Saturn",
    libretro: "Sega - Saturn",
    cores: ["yabause_libretro", "beetle_saturn_libretro", "kronos_libretro"],
    extensions: [".cue", ".chd", ".iso"],
  },
  DREAMCAST: {
    name: "Sega Dreamcast",
    libretro: "Sega - Dreamcast",
    cores: ["flycast_libretro"],
    extensions: [".cdi", ".gdi", ".chd"],
  },

  // ATARI
  ATARI_2600: {
    name: "Atari 2600",
    libretro: "Atari - 2600",
    cores: ["stella_libretro", "stella2014_libretro"],
    extensions: [".a26", ".bin", ".zip"],
  },
  ATARI_5200: {
    name: "Atari 5200",
    libretro: "Atari - 5200",
    cores: ["a5200_libretro"],
    extensions: [".a52", ".bin", ".zip"],
  },
  ATARI_7800: {
    name: "Atari 7800",
    libretro: "Atari - 7800",
    cores: ["prosystem_libretro"],
    extensions: [".a78", ".bin", ".zip"],
  },
  LYNX: {
    name: "Atari Lynx",
    libretro: "Atari - Lynx",
    cores: ["handy_libretro", "mednafen_lynx_libretro"],
    extensions: [".lnx", ".zip"],
  },
  JAGUAR: {
    name: "Atari Jaguar",
    libretro: "Atari - Jaguar",
    cores: ["virtualjaguar_libretro"],
    extensions: [".j64", ".jag", ".zip"],
  },
  ATARI_ST: {
    name: "Atari ST",
    libretro: "Atari - ST",
    cores: ["hatari_libretro"],
    extensions: [".st", ".stx", ".msa", ".zip"],
  },

  // OTHERS & COMPUTERS
  COMMODORE_64: {
    name: "Commodore 64",
    libretro: "Commodore - 64",
    cores: ["vice_x64sc_libretro", "vice_x64_libretro"],
    extensions: [".d64", ".crt", ".t64", ".tap", ".zip"],
  },
  COMMODORE_128: {
    name: "Commodore 128",
    libretro: "Commodore - 128",
    cores: ["vice_x128_libretro"],
    extensions: [".d64", ".d71", ".d81", ".zip"],
  },
  VIC20: {
    name: "Commodore VIC-20",
    libretro: "Commodore - VIC-20",
    cores: ["vice_xvic_libretro"],
    extensions: [".prg", ".d64", ".tap", ".zip"],
  },
  AMIGA: {
    name: "Commodore Amiga",
    libretro: "Commodore - Amiga",
    cores: ["puae_libretro"],
    extensions: [".adf", ".lha", ".hdf", ".ipf", ".zip"],
  },
  PC_ENGINE: {
    name: "PC Engine / TurboGrafx-16",
    libretro: "NEC - PC Engine - TurboGrafx 16",
    cores: ["mednafen_pce_fast_libretro", "mednafen_supergrafx_libretro"],
    extensions: [".pce", ".zip"],
  },
  PC_ENGINE_CD: {
    name: "PC Engine CD / TurboGrafx-CD",
    libretro: "NEC - PC Engine CD - TurboGrafx-CD",
    cores: ["mednafen_pce_fast_libretro"],
    extensions: [".cue", ".chd"],
  },
  SUPERGRAFX: {
    name: "PC Engine SuperGrafx",
    libretro: "NEC - PC Engine SuperGrafx",
    cores: ["mednafen_supergrafx_libretro"],
    extensions: [".sgx", ".zip"],
  },
  PC_FX: {
    name: "PC-FX",
    libretro: "NEC - PC-FX",
    cores: ["mednafen_pcfx_libretro"],
    extensions: [".cue", ".chd"],
  },
  MSX: {
    name: "MSX / MSX2",
    libretro: "Microsoft - MSX - MSX2 - MSX2P - MSX Turbo R",
    cores: ["fmsx_libretro", "bluemsx_libretro"],
    extensions: [".rom", ".dsk", ".mx1", ".mx2", ".zip"],
  },
  X68000: {
    name: "Sharp X68000",
    libretro: "Sharp - X68000",
    cores: ["px68k_libretro"],
    extensions: [".dim", ".img", ".d88", ".hdf", ".zip"],
  },
  "3DO": {
    name: "Panasonic 3DO",
    libretro: "The 3DO Company - 3DO",
    cores: ["opera_libretro"],
    extensions: [".iso", ".bin", ".chd", ".cue"],
  },
  WONDERSWAN: {
    name: "Bandai WonderSwan / Color",
    libretro: "Bandai - WonderSwan Color",
    cores: ["mednafen_wswan_libretro"],
    extensions: [".ws", ".wsc", ".zip"],
  },
  INTELLIVISION: {
    name: "Mattel Intellivision",
    libretro: "Mattel - Intellivision",
    cores: ["freeintv_libretro"],
    extensions: [".int", ".bin", ".rom", ".zip"],
  },
  COLECOVISION: {
    name: "ColecoVision",
    libretro: "Coleco - ColecoVision",
    cores: ["gearcoleco_libretro", "bluemsx_libretro"],
    extensions: [".col", ".cv", ".bin", ".zip"],
  },
  ODYSSEY2: {
    name: "Magnavox Odyssey 2 / Videopac+",
    libretro: "Magnavox - Odyssey2",
    cores: ["o2em_libretro"],
    extensions: [".bin", ".zip"],
  },
  ZX_SPECTRUM: {
    name: "Sinclair ZX Spectrum",
    libretro: "Sinclair - ZX Spectrum",
    cores: ["fuse_libretro"],
    extensions: [".tzx", ".tap", ".z80", ".dsk", ".zip"],
  },
  AMSTRAD_CPC: {
    name: "Amstrad CPC",
    libretro: "Amstrad - CPC",
    cores: ["cap32_libretro", "crocods_libretro"],
    extensions: [".dsk", ".sna", ".zip"],
  },
  DOS: {
    name: "DOS",
    libretro: "DOS",
    cores: [
      "dosbox_pure_libretro",
      "dosbox_core_libretro",
      "dosbox_svn_libretro",
    ],
    extensions: [".zip", ".dosz", ".conf"],
  },
  SCUMMVM: {
    name: "ScummVM",
    libretro: "ScummVM",
    cores: ["scummvm_libretro"],
    extensions: [".scummvm", ".zip"],
  },
  PICO8: {
    name: "PICO-8",
    libretro: "PICO-8",
    cores: ["fake08_libretro"],
    extensions: [".p8", ".png", ".zip"],
  },
  TIC80: {
    name: "TIC-80",
    libretro: "TIC-80",
    cores: ["tic80_libretro"],
    extensions: [".tic", ".zip"],
  },
  CHIP8: {
    name: "CHIP-8",
    libretro: "CHIP-8",
    cores: ["jaxe_libretro"],
    extensions: [".ch8"],
  },
  SUPERVISION: {
    name: "Watara Supervision",
    libretro: "Watara - Supervision",
    cores: ["potator_libretro"],
    extensions: [".sv", ".bin", ".zip"],
  },
  VECTREX: {
    name: "GCE Vectrex",
    libretro: "GCE - Vectrex",
    cores: ["vecx_libretro"],
    extensions: [".vec", ".bin", ".zip"],
  },
  ARCADIA_2001: {
    name: "Emerson Arcadia 2001",
    libretro: "Emerson - Arcadia 2001",
    cores: ["mame_libretro"],
    extensions: [".bin", ".zip"],
  },

  // STANDALONE / ENGINES
  DINOTHAWR: {
    name: "Dinothawr",
    libretro: "Dinothawr",
    cores: ["dinothawr_libretro"],
    extensions: [".game", ".zip"],
  },
  DOOM: {
    name: "Doom (PrBoom)",
    libretro: "Doom",
    cores: ["prboom_libretro"],
    extensions: [".wad"],
  },
  QUAKE: {
    name: "Quake (TyrQuake)",
    libretro: "Quake",
    cores: ["tyrquake_libretro"],
    extensions: [".pak"],
  },
  CAVE_STORY: {
    name: "Cave Story (NXEngine)",
    libretro: "Cave Story",
    cores: ["nxengine_libretro"],
    extensions: [".exe", ".zip"],
  },
  MRBOOM: {
    name: "Mr. Boom",
    libretro: "MrBoom",
    cores: ["mrboom_libretro"],
    extensions: [".zip"],
  },
  CANNONBALL: {
    name: "Cannonball (OutRun)",
    libretro: "Cannonball",
    cores: ["cannonball_libretro"],
    extensions: [".game", ".zip"],
  },
};

export async function getMetadata(
  force = false,
): Promise<{ data: Metadata; lastUpdate: number | null }> {
  const cachedDict = await LocalStorage.getItem<string>(CACHE_KEY);
  const lastUpdate = (await LocalStorage.getItem<number>(TIME_KEY)) ?? null;
  const now = Date.now();

  const prefs = getPreferenceValues();

  const intervals: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  let needsUpdate = false;

  if (force || !lastUpdate) {
    needsUpdate = true;
  } else if (prefs.updateInterval !== "never") {
    const limit = intervals[prefs.updateInterval] || intervals["monthly"];
    if (now - lastUpdate > limit) {
      needsUpdate = true;
    }
  }

  let arcadeDict: Record<string, string> = {};
  let thumbsDict: Record<string, string> = {};
  let dosThumbsDict: Record<string, string> = {};
  let raidsDict: Record<string, Record<string, number>> = {};

  if (needsUpdate) {
    try {
      const fetchUrl =
        prefs.customDatabaseUrl && prefs.customDatabaseUrl.trim() !== ""
          ? prefs.customDatabaseUrl.trim()
          : FALLBACK_DATA_URL;

      const urlObj = new URL(fetchUrl);
      urlObj.searchParams.append("t", now.toString());

      const response = await fetch(urlObj.toString());

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const json = await response.json();

      if (json.arcade_names) {
        arcadeDict = json.arcade_names;
        thumbsDict = json.arcade_thumbs || {};
        dosThumbsDict = json.dos_thumbs || {};
        raidsDict = json.raids || {};
      } else if (typeof json === "object" && !json.systems) {
        arcadeDict = json;
      }

      const combined = {
        names: arcadeDict,
        thumbs: thumbsDict,
        dos_thumbs: dosThumbsDict,
        raids: raidsDict,
      };
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(combined));
      await LocalStorage.setItem(TIME_KEY, now);
      return {
        data: {
          systems: LOCAL_SYSTEMS,
          arcade_names: arcadeDict,
          arcade_thumbs: thumbsDict,
          dos_thumbs: dosThumbsDict,
          raids: raidsDict,
        },
        lastUpdate: now,
      };
    } catch (e) {
      console.error("Fetch failed:", e);
      if (force) {
        throw new Error("Failed to download database. Check network or URL.");
      }
    }
  }

  if (cachedDict) {
    const parsed = JSON.parse(cachedDict);
    arcadeDict = parsed.names || parsed;
    thumbsDict = parsed.thumbs || {};
    dosThumbsDict = parsed.dos_thumbs || {};
    raidsDict = parsed.raids || {};
  }
  return {
    data: {
      systems: LOCAL_SYSTEMS,
      arcade_names: arcadeDict,
      arcade_thumbs: thumbsDict,
      dos_thumbs: dosThumbsDict,
      raids: raidsDict,
    },
    lastUpdate,
  };
}
