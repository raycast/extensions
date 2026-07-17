import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  Icon,
  getPreferenceValues,
  Image,
  Color,
  environment,
} from "@raycast/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as path from "path";
import { launchGame } from "./utils/launcher";
import { Game, Achievement, PLATFORMS, ARCADE_SYSTEMS } from "./types";
interface GameMeta {
  release_year?: number;
  genres?: string[];
  developer?: string;
  publisher?: string;
  rating?: number;
}

interface AchievementData {
  total: number;
  earned: number;
  totalPoints?: number;
  earnedPoints?: number;
  developer?: string;
  publisher?: string;
  genre?: string;
  achievements: Achievement[];
  gameId: number;
}

interface PlayStat {
  lastPlayed: string;
  playCount: number;
}

type ProcessedGame = Game & {
  searchString: string;
  displayName: string;
  statKey: string;
  releaseYear?: string;
  rating?: number;
  meta?: GameMeta;
};

import { getMetadata, Metadata } from "./utils/metadata";
import { getAchievements } from "./utils/achievements";
import ManageLibraries from "./manage-libraries";
import { Detail } from "@raycast/api";
import fs from "fs/promises";

function sanitizeLibretroName(name: string): string {
  return name.replace(/[&*/:`<>?\\|"]/g, "_");
}

function getDisplayName(game: Game, db: Metadata | null): string {
  const baseName = path.parse(game.path).name;

  let title = db?.arcade_names?.[baseName.toLowerCase()] || baseName;

  title = title.replace(/^(.*?),\s*(The|A|An)\b(.*)$/i, "$2 $1$3");

  return title;
}

const SUPPORTED_RA_CORES = new Set([
  "fbneo_libretro",
  "snes9x_libretro",
  "genesis_plus_gx_libretro",
  "pcsx_rearmed_libretro",
  "mupen64plus_next_libretro",
  "mednafen_psx_libretro",
  "mednafen_saturn_libretro",
  "flycast_libretro",
  "ppsspp_libretro",
  "desmume_libretro",
  "melonds_libretro",
  "mgba_libretro",
  "gambatte_libretro",
  "sameboy_libretro",
  "bnes_libretro",
  "mesen_libretro",
  "kega_fusion_libretro",
  "picodrive_libretro",
  "yabause_libretro",
  "duckstation_libretro",
  "swanstation_libretro",
  "opera_libretro",
  "scummvm_libretro",
  "dosbox_pure_libretro",
  "tyrquake_libretro",
  "prboom_libretro",
  "nxengine_libretro",
  "beetle_psx_libretro",
  "beetle_saturn_libretro",
  "beetle_pce_fast_libretro",
  "beetle_supergrafx_libretro",
  "bsnes_libretro",
  "mesen-s_libretro",
  "fceumm_libretro",
  "nestopia_libretro",
  "puae_libretro",
  "vice_x64sc_libretro",
  "hatari_libretro",
  "stella_libretro",
  "prosystem_libretro",
  "handy_libretro",
  "virtualjaguar_libretro",
  "tgbdual_libretro",
  "gpsp_libretro",
  "np2kai_libretro",
  "pokemini_libretro",
  "vecx_libretro",
  "o2em_libretro",
]);

function getSystemIcon(consoleKey: string) {
  const key = consoleKey.toLowerCase();

  const customMap: Record<string, string> = {
    mame: "mame",
    fbneo: "fbneo",
    arcade: "arcade",
    neogeo: "neogeo",
  };

  const fileName = customMap[key] || key;

  return {
    source: `${fileName}.png`,
    fallback: Icon.GameController,
    tintColor: Color.PrimaryText,
  };
}

function baseNormalize(str: string, preserveRoman = false): string {
  let s = str.replace(/^(.*?),\s*(The|A|An)\b(.*)$/i, "$2 $1$3");

  s = s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!preserveRoman) {
    s = s
      .replace(/\bviii\b/g, "8")
      .replace(/\bvii\b/g, "7")
      .replace(/\bvi\b/g, "6")
      .replace(/\biii\b/g, "3")
      .replace(/\bii\b/g, "2")
      .replace(/\biv\b/g, "4")
      .replace(/\bv\b/g, "5");
  }

  return s;
}

function generateCandidates(name: string): string[] {
  const base = baseNormalize(name);

  return [
    name.toLowerCase().trim(),
    base,
    base.replace(/\s/g, "_"),
    base.replace(/\s/g, ""),
    name.toLowerCase().replace(/[^a-z0-9]/g, ""),
  ];
}

function getBoxartUrls(
  systemDef: Metadata["systems"][string],
  game: Game,
  db: Metadata | null,
): string[] {
  const fileName = path.parse(game.path).name;
  const consoleKey = game.console.toUpperCase();

  if (ARCADE_SYSTEMS.includes(consoleKey)) {
    const urls: string[] = [];
    const lookupKey = fileName.toLowerCase();

    const thumbName = db?.arcade_thumbs?.[lookupKey];
    if (thumbName) {
      const sanitizedThumb = sanitizeLibretroName(thumbName);
      const ext = sanitizedThumb.toLowerCase().endsWith(".png") ? "" : ".png";

      urls.push(
        `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Boxarts/${encodeURIComponent(sanitizedThumb)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/MAME/Named_Boxarts/${encodeURIComponent(sanitizedThumb)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Titles/${encodeURIComponent(sanitizedThumb)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/MAME/Named_Titles/${encodeURIComponent(sanitizedThumb)}${ext}`,
      );
    }

    const fullName = db?.arcade_names?.[lookupKey];
    if (fullName) {
      const sanitizedFull = sanitizeLibretroName(fullName);
      const ext = sanitizedFull.toLowerCase().endsWith(".png") ? "" : ".png";

      urls.push(
        `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Titles/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/MAME/Named_Titles/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Boxarts/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/MAME/Named_Boxarts/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Snaps/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
      urls.push(
        `https://thumbnails.libretro.com/MAME/Named_Snaps/${encodeURIComponent(sanitizedFull)}${ext}`,
      );
    }

    const sanitizedFile = sanitizeLibretroName(fileName);
    const extFile = sanitizedFile.toLowerCase().endsWith(".png") ? "" : ".png";
    urls.push(
      `https://thumbnails.libretro.com/FBNeo%20-%20Arcade%20Games/Named_Titles/${encodeURIComponent(sanitizedFile)}${extFile}`,
    );
    urls.push(
      `https://thumbnails.libretro.com/MAME/Named_Titles/${encodeURIComponent(sanitizedFile)}${extFile}`,
    );

    return urls;
  }

  let libretroName = systemDef?.libretro || systemDef?.name;
  let rawName = fileName;

  if (consoleKey.includes(PLATFORMS.DOS)) {
    libretroName = "DOS";
    const cleanName = fileName
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, "")
      .trim();

    if (db?.dos_thumbs?.[cleanName]) {
      rawName = db.dos_thumbs[cleanName];
    } else if (db?.dos_thumbs) {
      const thumbKeys = Object.keys(db.dos_thumbs);
      const alphaCleanName = cleanName.replace(/[^a-z0-9]/g, "");
      const exactAlphaMatch = thumbKeys.find(
        (k) => k.replace(/[^a-z0-9]/g, "") === alphaCleanName,
      );

      if (exactAlphaMatch) {
        rawName = db.dos_thumbs[exactAlphaMatch];
      } else {
        const normalizedFile = cleanName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 0 && w !== "the")
          .sort()
          .join(" ");

        const wordMatch = thumbKeys.find((k) => {
          const cleanK = k.replace(/\s*\(.*?\)\s*/g, "").trim();
          const normalizedK = cleanK
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 0 && w !== "the")
            .sort()
            .join(" ");
          return normalizedK === normalizedFile;
        });

        if (wordMatch) {
          rawName = db.dos_thumbs[wordMatch];
        } else {
          return [];
        }
      }
    } else {
      return [];
    }

    if (!libretroName) return [];
    const sanitizedName = sanitizeLibretroName(rawName);
    return [
      `https://thumbnails.libretro.com/${encodeURIComponent(libretroName)}/Named_Boxarts/${encodeURIComponent(sanitizedName)}.png`,
    ];
  }

  if (!systemDef || !libretroName) return [];
  const lookup = fileName.toLowerCase();
  const customName = db?.arcade_thumbs?.[lookup];

  if (customName) {
    const sanitizedName = sanitizeLibretroName(customName);
    return [
      `https://thumbnails.libretro.com/${encodeURIComponent(libretroName)}/Named_Boxarts/${encodeURIComponent(sanitizedName)}.png`,
    ];
  }

  const urls: string[] = [];
  const baseUrl = `https://thumbnails.libretro.com/${encodeURIComponent(libretroName)}/Named_Boxarts/`;

  const expandedName = fileName
    .replace(/\(U\)/i, "(USA)")
    .replace(/\(E\)/i, "(Europe)")
    .replace(/\(J\)/i, "(Japan)")
    .replace(/\(K\)/i, "(Korea)")
    .replace(/\(W\)/i, "(World)");

  urls.push(
    `${baseUrl}${encodeURIComponent(sanitizeLibretroName(expandedName))}.png`,
  );

  const noSquareBrackets = expandedName.replace(/\s*\[.*?\]\s*/g, "").trim();
  if (noSquareBrackets && noSquareBrackets !== expandedName) {
    urls.push(
      `${baseUrl}${encodeURIComponent(sanitizeLibretroName(noSquareBrackets))}.png`,
    );
  }

  const strippedName = expandedName
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s*\[.*?\]\s*/g, "")
    .trim();
  if (
    strippedName &&
    strippedName !== noSquareBrackets &&
    strippedName !== expandedName
  ) {
    urls.push(
      `${baseUrl}${encodeURIComponent(sanitizeLibretroName(strippedName))}.png`,
    );
  }

  return urls;
}

function AchievementList({
  achievements,
  gameId,
}: {
  achievements: Achievement[];
  gameId?: number;
}) {
  if (!achievements || achievements.length === 0) {
    return (
      <List navigationTitle="Achievements">
        <List.EmptyView
          icon={Icon.Trophy}
          title="No Achievements Loaded Yet"
          description="If this game supports achievements, they will appear once loaded in the detail panel."
          actions={
            gameId ? (
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Retroachievements"
                  icon={Icon.Link}
                  url={`https://retroachievements.org/game/${gameId}`}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Achievements"
      searchBarPlaceholder="Search achievements..."
    >
      {achievements.map((a) => (
        <List.Item
          key={a.id}
          icon={{ source: a.badgeUrl, mask: Image.Mask.RoundedRectangle }}
          title={a.name}
          subtitle={a.description}
          accessories={[
            ...(a.earnedHardcore ? [{ tag: "Hardcore" }] : []),
            { text: `${a.points || 0} Pts` },
            { text: a.earned ? "✅" : "🔒" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Achievement Details"
                target={<AchievementDetail achievement={a} gameId={gameId} />}
                icon={a.badgeUrl}
              />
              {gameId && (
                <Action.OpenInBrowser
                  title="Open Game on Retroachievements"
                  icon={Icon.Globe}
                  url={`https://retroachievements.org/game/${gameId}`}
                  shortcut={
                    process.platform === "darwin"
                      ? { modifiers: ["cmd", "shift"], key: "r" }
                      : { modifiers: ["ctrl", "shift"], key: "r" }
                  }
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AchievementDetail({
  achievement,
  gameId,
}: {
  achievement: Achievement;
  gameId?: number;
}) {
  const markdown = `
# ${achievement.name}
${achievement.description}

![Badge](${achievement.badgeUrl})
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={
              achievement.earned
                ? achievement.earnedHardcore
                  ? "Earned (Hardcore)"
                  : "Earned (Softcore)"
                : "Locked"
            }
            icon={
              achievement.earned
                ? achievement.earnedHardcore
                  ? "🏆"
                  : "✅"
                : "🔒"
            }
          />

          {achievement.dateEarned ? (
            <Detail.Metadata.Label
              title="Date Earned"
              text={achievement.dateEarned}
            />
          ) : null}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Points"
            text={`${achievement.points || 0} Pts`}
          />

          <Detail.Metadata.Label
            title="Total Unlocks"
            text={`👥 ${achievement.numAwarded || 0}`}
          />
          <Detail.Metadata.Label
            title="Hardcore Unlocks"
            text={`👥 ${achievement.numAwardedHardcore || 0}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Retroachievements"
            icon={Icon.Link}
            url={`https://retroachievements.org/achievement/${achievement.id}`}
            shortcut={
              process.platform === "darwin"
                ? { modifiers: ["cmd", "shift"], key: "r" }
                : { modifiers: ["ctrl", "shift"], key: "r" }
            }
          />
          {gameId && (
            <Action.OpenInBrowser
              title="Open Game on Retroachievements"
              icon={Icon.Globe}
              url={`https://retroachievements.org/game/${gameId}`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
const imageUrlCache = new Map<string, string>();
const MAX_CACHE = 200;
const cacheOrder: string[] = [];
function addToCache(key: string, value: string) {
  if (imageUrlCache.has(key)) {
    const index = cacheOrder.indexOf(key);
    if (index > -1) cacheOrder.splice(index, 1);
  }
  cacheOrder.push(key);
  imageUrlCache.set(key, value);
  if (imageUrlCache.size > MAX_CACHE) {
    const oldest = cacheOrder.shift();
    if (oldest) imageUrlCache.delete(oldest);
  }
}
async function findFirstValidUrl(
  urls: string[],
  signal: AbortSignal,
): Promise<string | null> {
  if (!urls || urls.length === 0) return null;

  const limitedUrls = urls.slice(0, 2);

  try {
    const fetchSignal = AbortSignal.any([signal, AbortSignal.timeout(3000)]);
    return await Promise.any(
      limitedUrls.map(async (url) => {
        const res = await fetch(url, { method: "HEAD", signal: fetchSignal });
        if (!res.ok) throw new Error("Not Found");
        return url;
      }),
    );
  } catch (e: unknown) {
    if (e instanceof Error && e.name !== "AbortError") {
      console.error("Image Fetch Error:", e);
    }
    return null;
  }
}
const GameDetail = ({
  game,
  db,
  meta,
  playStats,
  onAchievementsLoaded,
  isSelected,
}: {
  game: Game;
  db: Metadata;
  meta?: GameMeta;
  playStats?: PlayStat;
  onAchievementsLoaded?: (gamePath: string, data: AchievementData) => void;
  isSelected?: boolean;
}) => {
  const systemDef = db.systems[game.console];

  const boxartUrls = useMemo(
    () => getBoxartUrls(systemDef, game, db),
    [systemDef, game.path, game.console, db],
  );

  const prefs = getPreferenceValues();

  const [achievementData, setAchievementData] = useState<{
    total: number;
    earned: number;
    totalPoints?: number;
    earnedPoints?: number;
    developer?: string;
    publisher?: string;
    genre?: string;
    achievements: Achievement[];
    gameId: number;
  } | null>(null);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const activeRequestRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSelected) return;

    if (
      !prefs.retroAchievementsUsername ||
      !prefs.retroAchievementsApiKey ||
      !SUPPORTED_RA_CORES.has(game.core)
    ) {
      setAchievementData(null);
      setLoadingAchievements(false);
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const queueKey = game.path;

    // 🔒 SAFE DEDUPE (no global race condition)
    if (activeRequestRef.current.has(queueKey)) return;
    activeRequestRef.current.add(queueKey);

    setLoadingAchievements(true);

    const timer = setTimeout(async () => {
      try {
        const romShortName = path.parse(game.path).name;
        const consoleKey = game.console;

        let systemRaids =
          db.raids?.[consoleKey] ||
          db.raids?.[consoleKey.toLowerCase()] ||
          db.raids?.[consoleKey.toUpperCase()];

        if (!systemRaids && ARCADE_SYSTEMS.includes(consoleKey.toUpperCase())) {
          systemRaids = db.raids?.[PLATFORMS.ARCADE];
        }

        if (!systemRaids) return;

        const resolveGameId = (): number | null => {
          const lookupNames: string[] = [romShortName];
          const arcadeName = db.arcade_names?.[romShortName.toLowerCase()];

          if (arcadeName) {
            lookupNames.push(arcadeName);
            const splitMatch = arcadeName.split(/[:/-]/);
            if (splitMatch.length > 1 && splitMatch[0].trim().length > 0) {
              lookupNames.push(splitMatch[0].trim());
            }
          }

          const normalizedRaidsMap: Record<string, number> = {};
          for (const key in systemRaids) {
            const id = systemRaids[key];
            const cleanKey = baseNormalize(key);
            if (!normalizedRaidsMap[cleanKey]) {
              normalizedRaidsMap[cleanKey] = id;
            }
          }

          for (const currentName of lookupNames) {
            const candidates = generateCandidates(currentName);
            const baseRom = baseNormalize(currentName);

            for (const cand of candidates) {
              if (systemRaids[cand]) {
                return systemRaids[cand];
              }
            }

            if (normalizedRaidsMap[baseRom]) {
              return normalizedRaidsMap[baseRom];
            }

            for (const cand of candidates) {
              const normCand = baseNormalize(cand);
              if (normalizedRaidsMap[normCand]) {
                return normalizedRaidsMap[normCand];
              }
            }

            const removeStopWords = (str: string) =>
              str
                .replace(/\b(the|a|an|of|and|vs|in|on)\b/g, "")
                .replace(/\s+/g, " ")
                .trim();

            const superRom = removeStopWords(baseRom);

            if (superRom.length >= 5) {
              const sequelRegex = /^(2|3|4|5|6|7|8|9|10)\b/;

              for (const cleanDbKey in normalizedRaidsMap) {
                const superDb = removeStopWords(cleanDbKey);

                if (superDb === superRom) {
                  return normalizedRaidsMap[cleanDbKey];
                }

                if (superDb.startsWith(superRom + " ")) {
                  const remainder = superDb.substring(superRom.length).trim();
                  if (!sequelRegex.test(remainder)) {
                    return normalizedRaidsMap[cleanDbKey];
                  }
                }

                if (superRom.startsWith(superDb + " ")) {
                  const remainder = superRom.substring(superDb.length).trim();
                  if (!sequelRegex.test(remainder)) {
                    return normalizedRaidsMap[cleanDbKey];
                  }
                }
              }
            }
          }

          return null;
        };

        const gameId = resolveGameId();

        if (!gameId) return;

        const data = await getAchievements(
          prefs,
          gameId,
          abortController.signal,
        );

        if (!isMounted) return;

        setAchievementData(data ? { ...data, gameId } : null);

        // 🔥 SINGLE SOURCE OF TRUTH SYNC
        if (data && onAchievementsLoaded) {
          onAchievementsLoaded(game.path, { ...data, gameId });
        }
      } catch (e) {
        if (!isMounted) return;
        setAchievementData(null);
      } finally {
        activeRequestRef.current.delete(queueKey);
        setLoadingAchievements(false);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      abortController.abort();
      queueKey && activeRequestRef.current.delete(queueKey);
    };
  }, [isSelected, game.path, game.console, game.core, db]);

  const placeholderUrl = `file://${environment.assetsPath.replace(/\\/g, "/")}/nocover.png`;

  const transparentPixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const [displayUrl, setDisplayUrl] = useState<string>(transparentPixel);

  useEffect(() => {
    if (!isSelected) {
      setDisplayUrl(transparentPixel);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();
    let fetchTimer: NodeJS.Timeout;

    const rawFileName = path.parse(game.path).name;
    const cacheKey = `${game.console}_${rawFileName}`;
    if (!cacheKey || cacheKey.length > 300) return;

    if (imageUrlCache.has(cacheKey)) {
      const cached = imageUrlCache.get(cacheKey)!;
      setDisplayUrl(cached === "NOT_FOUND" ? placeholderUrl : cached);
      return;
    }

    LocalStorage.getItem<string>(`resolved_img_${cacheKey}`).then(
      (cachedUrl) => {
        if (!isMounted) return;
        if (cachedUrl) {
          addToCache(cacheKey, cachedUrl);
          setDisplayUrl(cachedUrl === "NOT_FOUND" ? placeholderUrl : cachedUrl);
          return;
        }

        if (!boxartUrls.length) {
          setDisplayUrl(placeholderUrl);
          return;
        }

        const firstCandidate = boxartUrls[0] || placeholderUrl;
        setDisplayUrl(firstCandidate);

        fetchTimer = setTimeout(() => {
          findFirstValidUrl(boxartUrls, abortController.signal)
            .then((url) => {
              if (!isMounted) return;
              const finalUrl = url || placeholderUrl;
              addToCache(cacheKey, url || "NOT_FOUND");
              setDisplayUrl(finalUrl);
              LocalStorage.setItem(
                `resolved_img_${cacheKey}`,
                url || "NOT_FOUND",
              );
            })
            .catch((error) => {
              if (error instanceof Error && error.name !== "AbortError") {
                console.error(
                  `[Image Fetch Error] Failed to fetch boxart for ${game.path}:`,
                  error,
                );
              }
            });
        }, 1000);
      },
    );

    return () => {
      isMounted = false;
      if (fetchTimer) clearTimeout(fetchTimer);
      abortController.abort();
    };
  }, [game.path, boxartUrls, placeholderUrl, isSelected]);

  const gameTitle = getDisplayName(game, db);

  const isInitialLoading = displayUrl.startsWith("data:image/png;base64");

  const consoleUpper = game.console.toUpperCase();

  let raycastWidth = 110;

  if (
    [
      "ARCADE",
      "FBNEO",
      "CPS1",
      "CPS2",
      "CPS3",
      "NEOGEO",
      "NEOGEO_CD",
      "ATOMISWAVE",
      "NAOMI",
      "DOS",
      "AMIGA",
      "ATARI_ST",
      "SCUMMVM",
      "CANNONBALL",
    ].includes(consoleUpper)
  ) {
    raycastWidth = 110;
  } else if (
    ["GBA", "PSP", "WONDERSWAN", "GAME_GEAR", "LYNX", "SEGA_32X"].includes(
      consoleUpper,
    )
  ) {
    raycastWidth = 120;
  } else if (["N64", "SNES"].includes(consoleUpper)) {
    raycastWidth = 180;
  } else if (["GB", "GBC", "PICO8", "TIC80", "CHIP8"].includes(consoleUpper)) {
    raycastWidth = 120;
  }
  const imgMarkdown = `![Cover](${displayUrl}?raycast-width=${raycastWidth})`;

  const markdownContent = `
# ${gameTitle}

${isInitialLoading ? `_Loading cover image..._` : imgMarkdown}
  `;

  return (
    <List.Item.Detail
      markdown={markdownContent}
      metadata={
        <List.Item.Detail.Metadata>
          {SUPPORTED_RA_CORES.has(game.core) &&
            (loadingAchievements ||
              (achievementData && achievementData.total > 0) ||
              (!loadingAchievements &&
                (!prefs.retroAchievementsUsername ||
                  !prefs.retroAchievementsApiKey))) && (
              <>
                {loadingAchievements && (
                  <List.Item.Detail.Metadata.Label
                    title="Achievements"
                    text="Loading..."
                  />
                )}
                {!loadingAchievements &&
                  (!prefs.retroAchievementsUsername ||
                    !prefs.retroAchievementsApiKey) && (
                    <List.Item.Detail.Metadata.Label
                      title="Achievements"
                      text="Credentials Missing"
                      icon={Icon.Warning}
                    />
                  )}
                {achievementData && achievementData.total > 0 && (
                  <>
                    {achievementData.earned === achievementData.total ? (
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text="Beaten"
                        icon="🏆"
                      />
                    ) : (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Completion"
                          text={`${"█".repeat(Math.round((achievementData.earned / achievementData.total) * 10))}${"░".repeat(
                            10 -
                              Math.round(
                                (achievementData.earned /
                                  achievementData.total) *
                                  10,
                              ),
                          )}  ${achievementData.earned}/${achievementData.total}`}
                        />
                        {achievementData.achievements.filter((a) => a.earned)
                          .length > 0 && (
                          <List.Item.Detail.Metadata.TagList title="Recent">
                            {achievementData.achievements
                              .filter((a) => a.earned)
                              .slice(0, 5)
                              .map((a) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={a.id}
                                  icon={{
                                    source: a.badgeUrl,
                                    mask: Image.Mask.RoundedRectangle,
                                  }}
                                />
                              ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Game Points"
                      text={`${achievementData.earnedPoints || 0} / ${achievementData.totalPoints || 0} Pts`}
                    />
                  </>
                )}
                <List.Item.Detail.Metadata.Separator />
              </>
            )}
          {playStats && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Play Count"
                text={playStats.playCount.toString()}
                icon={Icon.PlayFilled}
              />
              <List.Item.Detail.Metadata.Label
                title="Last Played"
                text={new Date(playStats.lastPlayed).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
                icon={Icon.Clock}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {meta && (
            <>
              {meta.rating && meta.rating > 0 ? (
                <List.Item.Detail.Metadata.Label
                  title="IGDB Rating"
                  text={`⭐ ${meta.rating} / 100`}
                />
              ) : null}
              {meta.release_year ? (
                <List.Item.Detail.Metadata.Label
                  title="Release Year"
                  text={String(meta.release_year)}
                  icon={Icon.Calendar}
                />
              ) : null}
              {meta.developer ? (
                <List.Item.Detail.Metadata.Label
                  title="Developer"
                  text={meta.developer}
                />
              ) : null}
              {meta.publisher ? (
                <List.Item.Detail.Metadata.Label
                  title="Publisher"
                  text={meta.publisher}
                />
              ) : null}
              {meta.genres && meta.genres.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Genres">
                  {meta.genres.map((g: string) => (
                    <List.Item.Detail.Metadata.TagList.Item key={g} text={g} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title="System"
            text={systemDef?.name || game.console}
            icon={Icon.ComputerChip}
          />
          <List.Item.Detail.Metadata.Label
            title="Core"
            text={game.core}
            icon={Icon.Gear}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Format"
            text={
              path.extname(game.path).toUpperCase().replace(".", "") ||
              "UNKNOWN"
            }
            icon={Icon.Document}
          />
          <List.Item.Detail.Metadata.Label
            title="Location"
            text={path.basename(path.dirname(game.path))}
            icon={Icon.Folder}
          />
          <List.Item.Detail.Metadata.Label title="Full Path" text={game.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [games, setGames] = useState<ProcessedGame[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemFilter, setSystemFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("AZ");
  const [initialDropdown, setInitialDropdown] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<Record<string, PlayStat>>({});
  const [achievementCache, setAchievementCache] = useState<
    Record<string, AchievementData>
  >({});
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchText);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 250);
    return () => clearTimeout(t);
  }, [searchText]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectionTimer = useRef<NodeJS.Timeout | null>(null);
  const isDataLoadingRef = useRef(false);

  const { showDetails } = getPreferenceValues<{ showDetails: boolean }>();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (isDataLoadingRef.current) return;
    isDataLoadingRef.current = true;
    setIsLoading(true);
    try {
      const { data: db } = await getMetadata();
      setMetadata(db);

      const cachePath = path.join(environment.supportPath, "gamesCache.json");
      let scannedGames: Game[] = [];
      try {
        const gamesCacheRaw = await fs.readFile(cachePath, "utf8");
        scannedGames = JSON.parse(gamesCacheRaw);
      } catch (e) {
        console.error("Games cache file read error:", e);
      }

      let tempMeta: Record<string, GameMeta> = {};
      try {
        const metaPath = path.join(
          environment.assetsPath,
          "game_metadata.json",
        );
        const metaRaw = await fs.readFile(metaPath, "utf8");
        tempMeta = JSON.parse(metaRaw) as Record<string, GameMeta>;
      } catch (error) {
        console.error("Metadata JSON parse error:", error);
      }

      const processedGames: ProcessedGame[] = scannedGames
        .map((game) => {
          const fileName = path.parse(game.path).name;
          const displayName = getDisplayName(game, db);
          const searchParts = [
            displayName.toLowerCase(),
            fileName.toLowerCase(),
          ];

          const keyFromFile = baseNormalize(fileName);
          const keyFromDisplay = baseNormalize(displayName);
          const gameMeta =
            tempMeta[keyFromFile] || tempMeta[keyFromDisplay] || null;

          if (gameMeta) {
            if (gameMeta.release_year)
              searchParts.push(String(gameMeta.release_year));
            if (gameMeta.genres)
              searchParts.push(
                ...gameMeta.genres.map((g: string) => g.toLowerCase()),
              );
            if (gameMeta.developer)
              searchParts.push(gameMeta.developer.toLowerCase());
            if (gameMeta.publisher)
              searchParts.push(gameMeta.publisher.toLowerCase());
          }

          const parentFolder = path.basename(path.dirname(game.path));
          const statKey = `${parentFolder}_${game.console}_${fileName}`;

          return {
            ...game,
            searchString: searchParts.join(" ").toLowerCase(),
            displayName,
            statKey,
            meta: gameMeta,
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      tempMeta = {};

      const statsRaw = await LocalStorage.getItem<string>("playStats");
      if (statsRaw) {
        try {
          const stats = JSON.parse(statsRaw);
          let needsSave = false;

          for (const game of scannedGames) {
            if (stats[game.path]) {
              const parentFolder = path.basename(path.dirname(game.path));
              const rawFileName = path.parse(game.path).name;
              const newKey = `${parentFolder}_${game.console}_${rawFileName}`;

              stats[newKey] = stats[game.path];
              delete stats[game.path];
              needsSave = true;
            }
          }

          if (needsSave) {
            await LocalStorage.setItem("playStats", JSON.stringify(stats));
          }
          setGlobalStats(stats);
        } catch (e) {
          console.error("Stats migration parse error", e);
        }
      }

      const savedSort = await LocalStorage.getItem<string>("sortOrder");
      if (savedSort) {
        setSortOrder(savedSort);
        setInitialDropdown(savedSort);
      } else {
        setInitialDropdown("AZ");
      }
      setGames(processedGames);
    } finally {
      setIsLoading(false);
      isDataLoadingRef.current = false;
    }
  }

  const uniqueSystems = useMemo(() => {
    return Array.from(new Set(games.map((g) => g.console))).sort((a, b) => {
      const nameA = metadata?.systems[a]?.name || a;
      const nameB = metadata?.systems[b]?.name || b;
      return nameA.localeCompare(nameB);
    });
  }, [games, metadata]);

  const MAX_ACHIEVEMENT_CACHE = 50;

  const handleAchievementsLoaded = useCallback(
    (gamePath: string, data: AchievementData) => {
      setAchievementCache((prev) => {
        if (
          prev[gamePath]?.earned === data?.earned &&
          prev[gamePath]?.total === data?.total &&
          prev[gamePath]?.gameId
        )
          return prev;
        const updated = { ...prev, [gamePath]: data };
        const keys = Object.keys(updated);
        if (keys.length > MAX_ACHIEVEMENT_CACHE) {
          const toRemove = keys.slice(0, keys.length - MAX_ACHIEVEMENT_CACHE);
          toRemove.forEach((k) => delete updated[k]);
        }
        return updated;
      });
    },
    [],
  );

  const finalGamesList = useMemo(() => {
    const systemFiltered =
      systemFilter === "ALL"
        ? games
        : games.filter((g) => g.console === systemFilter);

    const trimmed = debouncedSearch.trim().toLowerCase();

    if (!trimmed) {
      return [...systemFiltered].sort((a, b) => {
        if (sortOrder === "LAST_PLAYED") {
          const dateA = globalStats[a.statKey]?.lastPlayed
            ? new Date(globalStats[a.statKey].lastPlayed).getTime()
            : 0;
          const dateB = globalStats[b.statKey]?.lastPlayed
            ? new Date(globalStats[b.statKey].lastPlayed).getTime()
            : 0;
          return dateB - dateA;
        }
        if (sortOrder === "MOST_PLAYED") {
          const countA = globalStats[a.statKey]?.playCount || 0;
          const countB = globalStats[b.statKey]?.playCount || 0;
          return countB - countA;
        }
        return a.displayName.localeCompare(b.displayName);
      });
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const results: { game: ProcessedGame; score: number }[] = [];

    for (let i = 0; i < systemFiltered.length; i++) {
      const g = systemFiltered[i];

      let matched = true;
      for (const t of tokens) {
        if (!g.searchString.includes(t)) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      let score = 0;
      const name = g.displayName.toLowerCase();
      const raw = path.parse(g.path).name.toLowerCase();

      for (const t of tokens) {
        if (name === t || raw === t) score += 100;
        else if (name.includes(t)) score += 45;
        else if (raw.includes(t)) score += 40;
        else score += 15;
      }

      score -= Math.max(0, tokens.length - 1) * 3;
      results.push({ game: g, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.map((r) => r.game);
  }, [games, systemFilter, debouncedSearch, sortOrder, globalStats]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Filter games by name..."
      isShowingDetail={showDetails && finalGamesList.length > 0}
      onSelectionChange={(id) => {
        if (selectionTimer.current) clearTimeout(selectionTimer.current);
        selectionTimer.current = setTimeout(() => {
          setSelectedId(id ?? null);
        }, 200);
      }}
      searchBarAccessory={
        initialDropdown ? (
          <List.Dropdown
            tooltip="Sort & Filter"
            defaultValue={initialDropdown}
            onChange={async (val) => {
              if (["AZ", "LAST_PLAYED", "MOST_PLAYED"].includes(val)) {
                setSortOrder(val);
                await LocalStorage.setItem("sortOrder", val);
              } else {
                setSystemFilter(val);
              }
            }}
          >
            <List.Dropdown.Section title="Sort Options">
              <List.Dropdown.Item title="A-Z" value="AZ" icon={Icon.Text} />
              <List.Dropdown.Item
                title="Last Played"
                value="LAST_PLAYED"
                icon={Icon.Clock}
              />
              <List.Dropdown.Item
                title="Most Played"
                value="MOST_PLAYED"
                icon={Icon.Star}
              />
            </List.Dropdown.Section>

            <List.Dropdown.Section title="Filter by System">
              <List.Dropdown.Item
                title={systemFilter === "ALL" ? "✓ All Systems" : "All Systems"}
                value="ALL"
                icon={Icon.List}
              />
              {uniqueSystems.map((sys) => {
                const sysName = metadata?.systems[sys]?.name || sys;
                return (
                  <List.Dropdown.Item
                    key={sys}
                    title={systemFilter === sys ? `✓ ${sysName}` : sysName}
                    value={sys}
                    icon={getSystemIcon(sys)}
                  />
                );
              })}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <List.EmptyView
        icon={Icon.GameController}
        title="No ROMs Found"
        description="Press Enter to manage your libraries and add ROM folders."
        actions={
          <ActionPanel>
            <Action.Push
              title="Manage Libraries"
              target={<ManageLibraries onRefresh={loadData} />}
              icon={Icon.Gear}
            />
          </ActionPanel>
        }
      />

      {finalGamesList.map((game) => {
        const isSelected = metadata && selectedId && game.path === selectedId;

        return (
          <List.Item
            id={game.path}
            key={game.path}
            title={game.displayName}
            icon={getSystemIcon(game.console)}
            accessories={
              !showDetails
                ? [
                    {
                      text:
                        metadata?.systems[game.console]?.name || game.console,
                    },
                  ]
                : []
            }
            detail={
              metadata && isSelected ? (
                <GameDetail
                  game={game}
                  db={metadata}
                  meta={game.meta}
                  playStats={globalStats[game.statKey]}
                  onAchievementsLoaded={handleAchievementsLoaded}
                  isSelected={true}
                />
              ) : null
            }
            actions={
              <ActionPanel>
                <Action
                  title="Play Now"
                  icon={Icon.PlayFilled}
                  onAction={() => launchGame(game)}
                />
                <Action.ShowInFinder
                  title="Show in Explorer"
                  path={game.path}
                  shortcut={
                    process.platform === "darwin"
                      ? { modifiers: ["cmd"], key: "e" }
                      : { modifiers: ["ctrl"], key: "e" }
                  }
                />
                {SUPPORTED_RA_CORES.has(game.core) &&
                  achievementCache[game.path]?.total > 0 && (
                    <Action.Push
                      title="View All Achievements"
                      icon={Icon.Trophy}
                      target={
                        <AchievementList
                          achievements={
                            achievementCache[game.path]?.achievements || []
                          }
                          gameId={achievementCache[game.path]?.gameId}
                        />
                      }
                      shortcut={
                        process.platform === "darwin"
                          ? { modifiers: ["cmd", "shift"], key: "a" }
                          : { modifiers: ["ctrl", "shift"], key: "a" }
                      }
                    />
                  )}
                <Action.Push
                  title="Manage Libraries"
                  target={<ManageLibraries onRefresh={loadData} />}
                  icon={Icon.Gear}
                  shortcut={
                    process.platform === "darwin"
                      ? { modifiers: ["cmd"], key: "m" }
                      : { modifiers: ["ctrl"], key: "m" }
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
