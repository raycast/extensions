// src/data/appinfo.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs/promises";
import path from "path";
import os from "os";
import { getDefaultSteamPath } from "./steam";
import { DEFAULT_CONFIG, RemoteConfig } from "./config";

const DEBUG_MODE = process.env.NODE_ENV !== "production";

export interface ScoreBreakdown {
  name: number;
  type: number;
  genres: number;
  tags: number;
  categories: number;
  image: number;
}

export interface AppInfoMetadata {
  name: string;
  genres: string[];
  tags: string[];
  categories: string[];
  confidence: number;
  breakdown: ScoreBreakdown;
  releaseDate?: number;
  developer?: string;
}

export interface AppMetadataResult {
  apps: Map<number, AppInfoMetadata>;
  rejected: Set<number>;
  schemaWarning?: boolean;
}

const CACHE_FILE = path.join(os.tmpdir(), "raycast_steam_appinfo_cache.json");

function isVDFArrayLike(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.every((k) => /^\d+$/.test(k));
}

function isValidName(name: string): boolean {
  if (!name || name.length > 200) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F]/.test(name)) return false;
  return true;
}

function normalizeConfidence(rawScore: number): number {
  // name(5) + type(3) + genres(1) + tags(1) + categories(1) + image(1) = 12
  const MAX_POSSIBLE_SCORE = 5 + 3 + 1 + 1 + 1 + 1;
  return Math.min(100, Math.round((rawScore / MAX_POSSIBLE_SCORE) * 100));
}

export async function getLocalAppMetadata(
  customSteamPath: string,
): Promise<AppMetadataResult> {
  const defaultPath = (await getDefaultSteamPath()) || "";

  const pathsToTry = [
    path.join(customSteamPath, "appcache", "appinfo.vdf"),
    path.join(defaultPath, "appcache", "appinfo.vdf"),
  ];

  let targetPath = "";
  let currentMtime = 0;

  for (const p of pathsToTry) {
    try {
      const stats = await fs.stat(p);
      targetPath = p;
      currentMtime = stats.mtimeMs;
      break;
    } catch (error) {
      /* ignore */
    }
  }
  if (!targetPath) return { apps: new Map(), rejected: new Set() };

  const config = DEFAULT_CONFIG;

  try {
    const cacheData = await fs.readFile(CACHE_FILE, "utf-8");
    const parsedCache = JSON.parse(cacheData);

    if (
      parsedCache.mtime === currentMtime &&
      parsedCache.tagMapVersion === config.tagMapVersion &&
      parsedCache.schemaVersion === config.schemaVersion
    ) {
      if (DEBUG_MODE) {
        console.log(
          `\n[AppInfo] ⚡ Data loaded from cache. (Total: ${parsedCache.data.length})`,
        );
        const sampleGames = parsedCache.data.slice(0, 3);
        sampleGames.forEach(([id, data]: [number, any]) => {
          console.log(
            ` ├─ [Cache] ID: ${id} | Name: ${data.name} | Genres: ${data.genres.join(", ")}`,
          );
        });
      }

      return {
        apps: new Map(parsedCache.data),
        rejected: new Set(parsedCache.rejected || []),
      };
    }
  } catch (error) {
    /* ignore */
  }

  let result: AppMetadataResult = { apps: new Map(), rejected: new Set() };
  if (config.schemaVersion !== 1 && DEBUG_MODE) {
    console.warn(
      `[AppInfo] Unknown schemaVersion (${config.schemaVersion}). v1 parser is being used as a fallback.`,
    );
  }
  result = await parseAppInfoVDF_v1(targetPath, config);

  try {
    const cachePayload = JSON.stringify({
      mtime: currentMtime,
      tagMapVersion: config.tagMapVersion,
      schemaVersion: config.schemaVersion,
      data: Array.from(result.apps.entries()),
      rejected: Array.from(result.rejected),
    });
    await fs.writeFile(CACHE_FILE, cachePayload, "utf-8");
  } catch (error) {
    /* ignore */
  }

  return result;
}

async function parseAppInfoVDF_v1(
  targetPath: string,
  config: RemoteConfig,
): Promise<AppMetadataResult> {
  let loggedSampleCount = 0;
  const appMap = new Map<number, AppInfoMetadata>();
  const rejectedSet = new Set<number>();
  let buf: Buffer | null;
  try {
    buf = await fs.readFile(targetPath);
  } catch (e) {
    return { apps: appMap, rejected: rejectedSet };
  }
  if (buf.length < 8) return { apps: appMap, rejected: rejectedSet };

  const telemetry = {
    totalAppsFound: 0,
    parsedSuccessfully: 0,
    skippedOrFailed: 0,
    strategyUsed: "UNKNOWN",
    totalConfidenceSum: 0,
  };

  const magic = buf.readUInt32LE(0);
  let pos = 0;
  let useStrTab = false;

  let strategy = config.parserStrategy;
  if (strategy === "AUTO") {
    if (magic === 0x07564427) {
      pos = 8;
      strategy = "FAST";
    } else if ([0x07564428, 0x07564429, 0x0756442a].includes(magic)) {
      useStrTab = true;
      pos = 16;
      strategy = "FAST";
    } else {
      if (DEBUG_MODE)
        console.warn(
          `[AppInfo] Unknown Magic Byte (0x${magic.toString(16)}). Falling back to BRUTE_FORCE strategy.`,
        );
      strategy = "BRUTE_FORCE";
      pos = 0;
      useStrTab = false;
    }
  }
  telemetry.strategyUsed = strategy;

  const strTable: string[] = [];
  if (strategy === "FAST" && useStrTab) {
    if (buf.length < 16) {
      strategy = "BRUTE_FORCE";
      useStrTab = false;
      pos = 0;
    } else {
      const strOff = Number(buf.readBigUInt64LE(8));
      let strPos = strOff;
      if (strPos + 4 <= buf.length) {
        const count = buf.readUInt32LE(strPos);
        strPos += 4;
        for (let i = 0; i < count; i++) {
          if (strPos >= buf.length) break;
          const start = strPos;
          while (strPos < buf.length && buf[strPos] !== 0) strPos++;
          strTable.push(buf.toString("utf8", start, strPos));
          strPos++;
        }
      }
    }
  }

  let loopCount = 0;

  if (strategy === "BRUTE_FORCE") {
    while (pos < buf.length - 8) {
      const nextZero = buf.indexOf(0, pos);
      if (nextZero === -1 || nextZero >= buf.length - 8) break;
      pos = nextZero;

      if (buf[pos] === 0) {
        const nextByte = buf[pos + 1];
        if (nextByte >= 32 && nextByte <= 126) {
          const chunkEnd = buf.length;
          const vdfObj = readVDF(buf, pos, chunkEnd, false, []);

          if (vdfObj && vdfObj.value) {
            const possibleAppId = Number(vdfObj.key);
            if (!isNaN(possibleAppId) && possibleAppId > 0) {
              const result = extractSchema(vdfObj.value, config);

              if (result && result.rawScore >= config.thresholds.minScore) {
                const normalizedConfidence = normalizeConfidence(
                  result.rawScore,
                );
                appMap.set(possibleAppId, {
                  name: result.name,
                  genres: result.genres,
                  tags: result.tags,
                  categories: result.categories,
                  confidence: normalizedConfidence,
                  breakdown: result.breakdown,
                });
                telemetry.parsedSuccessfully++;
                telemetry.totalConfidenceSum += normalizedConfidence;

                if (loggedSampleCount < 3) {
                  if (DEBUG_MODE) {
                    console.log(
                      `\n[Sample Game Discovery (Brute Force)] ID: ${possibleAppId}`,
                    );
                    console.log(` ├─ Name:   ${result.name}`);
                    console.log(
                      ` ├─ Genres: ${result.genres.length > 0 ? result.genres.join(", ") : "Not Found"}`,
                    );
                    console.log(` └─ Confidence: ${normalizedConfidence}%`);
                  }
                  loggedSampleCount++;
                }
              } else {
                rejectedSet.add(possibleAppId);
              }
            }
            pos = vdfObj._nextPos > pos ? vdfObj._nextPos - 1 : pos;
          }
        }
      }
      pos++;
      loopCount++;
      if (loopCount % 50000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
  } else {
    while (pos < buf.length) {
      if (pos + 8 > buf.length) break;
      const appId = buf.readUInt32LE(pos);
      pos += 4;
      if (appId === 0) break;

      telemetry.totalAppsFound++;

      const size = buf.readUInt32LE(pos);
      pos += 4;
      const nextAppPos = pos + size;

      if (size <= 0 || nextAppPos > buf.length) {
        telemetry.skippedOrFailed++;
        break;
      }

      let bestRawScore = 0;
      let bestMatchData: AppInfoMetadata | null = null;
      const MAX_SCAN = Math.min(config.thresholds.maxScan, size);

      for (let offset = 0; offset < MAX_SCAN; offset++) {
        const scanPos = pos + offset;

        if (scanPos + 1 >= nextAppPos || scanPos + 4 >= buf.length) break;

        if (buf[scanPos] === 0) {
          if (useStrTab) {
            const idx = buf.readUInt32LE(scanPos + 1);
            if (idx >= strTable.length) continue;
          } else {
            const nextByte = buf[scanPos + 1];
            if (nextByte < 32 || nextByte > 126) continue;
          }

          const vdfObj = readVDF(buf, scanPos, nextAppPos, useStrTab, strTable);

          if (vdfObj && vdfObj.value) {
            const extracted = extractSchema(vdfObj.value, config);
            if (extracted && extracted.rawScore > bestRawScore) {
              bestRawScore = extracted.rawScore;
              bestMatchData = {
                name: extracted.name,
                genres: extracted.genres,
                tags: extracted.tags,
                categories: extracted.categories,
                confidence: normalizeConfidence(bestRawScore),
                breakdown: extracted.breakdown,
              };
              if (bestRawScore >= config.thresholds.acceptScore) break;
            }
          }
        }
      }

      if (bestMatchData && bestRawScore >= config.thresholds.minScore) {
        appMap.set(appId, bestMatchData);
        telemetry.parsedSuccessfully++;
        telemetry.totalConfidenceSum += bestMatchData.confidence;

        if (loggedSampleCount < 3) {
          if (DEBUG_MODE) {
            console.log(`\n[Sample Game Discovery] ID: ${appId}`);
            console.log(` ├─ Name:   ${bestMatchData.name}`);
            console.log(
              ` ├─ Genres: ${bestMatchData.genres.length > 0 ? bestMatchData.genres.join(", ") : "Not Found"}`,
            );
            console.log(` └─ Confidence: ${bestMatchData.confidence}%`);
          }
          loggedSampleCount++;
        }
      } else {
        rejectedSet.add(appId);
        telemetry.skippedOrFailed++;
      }

      pos = nextAppPos;
      loopCount++;
      if (loopCount % 50000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
  }

  const avgConfidence =
    telemetry.parsedSuccessfully > 0
      ? (telemetry.totalConfidenceSum / telemetry.parsedSuccessfully).toFixed(2)
      : 0;

  if (DEBUG_MODE) {
    console.log("\n--- [AppInfo] Parsing Telemetry ---");
    console.table({
      Strategy: telemetry.strategyUsed,
      "Total Games": telemetry.totalAppsFound,
      Successful: telemetry.parsedSuccessfully,
      "Skipped/Failed": telemetry.skippedOrFailed,
      "Avg Confidence (%)": avgConfidence,
    });
  }

  const schemaWarning =
    telemetry.totalAppsFound > 0 && telemetry.parsedSuccessfully === 0;

  buf = null;

  return { apps: appMap, rejected: rejectedSet, schemaWarning };
}

function extractSchema(
  rootVal: any,
  config: RemoteConfig,
): {
  name: string;
  genres: string[];
  tags: string[];
  categories: string[];
  rawScore: number;
  breakdown: ScoreBreakdown;
  releaseDate: number;
  developer: string;
} | null {
  let common = rootVal?.common || rootVal?.appinfo?.common;
  let extended = rootVal?.extended || rootVal?.appinfo?.extended;

  const releaseDate = Number(common?.steam_release_date) || 0;
  const developer = String(common?.developer || extended?.developer || "");
  let appConfig = rootVal?.config || rootVal?.appinfo?.config;

  if (!common || typeof common !== "object") {
    for (const key in rootVal) {
      const child = rootVal[key];
      if (child && typeof child === "object" && child.name && child.type) {
        common = child;
        extended = child.extended || rootVal[key]?.extended;
        appConfig = child.config || rootVal[key]?.config;
        break;
      }
    }
  }

  if (common && typeof common === "object") {
    if (!common.name && !common.type) return null;

    if (Object.keys(common).length > 200) return null;

    const rawName = typeof common.name === "string" ? common.name : "";

    // eslint-disable-next-line no-control-regex
    const name = rawName.replace(/[\x00-\x1F\x7F]/g, "").trim();
    if (!isValidName(name)) return null;

    const typeStr = String(
      common?.type || extended?.type || rootVal?.type || "",
    )
      .toLowerCase()
      .trim();

    if (typeStr !== "game") return null;

    const hasLaunch =
      appConfig?.launch !== undefined && typeof appConfig.launch === "object";
    if (!hasLaunch) return null;

    const parentId = Number(common.parent) || 0;
    const baseAppId =
      Number(common.base_appid) || Number(extended?.base_appid) || 0;
    const dlcForAppId =
      Number(common.dlcforappid) || Number(extended?.dlcforappid) || 0;
    const isExplicitDLC =
      common.isdlc === "1" ||
      common.isdlc === 1 ||
      extended?.dlc === "1" ||
      extended?.dlc === 1 ||
      extended?.isdlc === "1" ||
      extended?.isdlc === 1;

    if (parentId > 0 || baseAppId > 0 || dlcForAppId > 0 || isExplicitDLC)
      return null;

    let isDLC = false;
    if (common.categories && typeof common.categories === "object") {
      for (const [key, v] of Object.entries(common.categories)) {
        if (key.toLowerCase() === "category_21") {
          isDLC = true;
          break;
        }

        let catStr = "";
        if (typeof v === "string" || typeof v === "number") catStr = String(v);
        else if (v && typeof v === "object") {
          const catObj = v as any;
          catStr = String(catObj.category || catObj.name || "");
        }
        if (
          catStr === "21" ||
          catStr.toLowerCase() === "downloadable content"
        ) {
          isDLC = true;
          break;
        }
      }
    }
    if (isDLC) return null;

    const nameLower = name.toLowerCase();
    const dlcRegex =
      /\b(dlc|expansion|season pass|artbook|upgrade|supporter pack|founder's pack|premium pack|deluxe|bundle|key|bonus content|soundtrack|ost|beta|playtest|prototype|public testing|test server|demo)\b/i;
    if (dlcRegex.test(nameLower)) return null;

    const breakdown: ScoreBreakdown = {
      name: 0,
      type: 0,
      genres: 0,
      tags: 0,
      categories: 0,
      image: 0,
    };
    let currentScore = 0;

    const genres = new Set<string>();
    const tags = new Set<string>();
    const categories = new Set<string>();

    breakdown.name = 5;
    currentScore += 5;
    breakdown.type = 3;
    currentScore += 3;

    if (isVDFArrayLike(common.genres)) {
      breakdown.genres = 1;
      currentScore += 1;
    }
    if (isVDFArrayLike(common.store_tags)) {
      breakdown.tags = 1;
      currentScore += 1;
    }

    const rawCategories = common.category || common.categories;
    if (rawCategories && typeof rawCategories === "object") {
      breakdown.categories = 1;
      currentScore += 1;
    }
    if (typeof common.header_image === "string") {
      const imgLower = common.header_image.toLowerCase();
      if (
        imgLower.includes(".jpg") ||
        imgLower.includes(".jpeg") ||
        imgLower.includes(".png")
      ) {
        breakdown.image = 1;
        currentScore += 1;
      }
    }

    const parseTraits = (
      obj: any,
      targetSet: Set<string>,
      remoteDict?: Record<string, string>,
    ) => {
      if (typeof obj === "object" && obj !== null) {
        for (const v of Object.values(obj)) {
          let val = "";
          if (typeof v === "string") val = v;
          else if (typeof v === "number" || typeof v === "bigint")
            val = v.toString();
          else if (v && typeof v === "object")
            val = String((v as any).category || (v as any).name || "");

          if (val) {
            if (remoteDict && remoteDict[val]) targetSet.add(remoteDict[val]);
            else if (!/^\d+$/.test(val) && val.length < 50) targetSet.add(val);
          }
        }
      }
    };

    parseTraits(common.genres, genres, config.steamGenres);
    parseTraits(common.store_tags, tags, config.steamTags);

    if (rawCategories && typeof rawCategories === "object") {
      for (const key of Object.keys(rawCategories)) {
        const match = key.match(/^category_(\d+)$/i);
        if (match) {
          const catId = match[1];
          if (config.steamCategories && config.steamCategories[catId]) {
            categories.add(config.steamCategories[catId]);
          }
        }
      }
    }

    return {
      name,
      genres: Array.from(genres),
      tags: Array.from(tags),
      categories: Array.from(categories),
      releaseDate,
      developer,
      rawScore: currentScore,
      breakdown,
    };
  }
  return null;
}

function readVDF(
  buf: Buffer,
  startPos: number,
  endPos: number,
  useStrTab: boolean,
  strTable: string[],
  depth = 0,
): any {
  if (depth > 12 || startPos >= endPos) return null;
  let pos = startPos;

  const type = buf[pos++];
  if (type === 8) return null;

  if (type !== 0 && type !== 1 && type !== 2 && type !== 3 && type !== 7)
    return null;

  let key = "";
  if (useStrTab) {
    if (pos + 4 > endPos) return null;
    const idx = buf.readUInt32LE(pos);
    pos += 4;
    if (idx >= strTable.length) return null;
    key = strTable[idx] || "";
  } else {
    const start = pos;
    while (pos < endPos && buf[pos] !== 0) pos++;
    key = buf.toString("utf8", start, pos);
    pos++;
  }

  if (type === 0) {
    const obj: any = {};
    let safeLoopCount = 0;
    const MAX_ITER = 1_000_000;

    while (pos < endPos && buf[pos] !== 8) {
      if (++safeLoopCount > MAX_ITER) break;

      const child = readVDF(buf, pos, endPos, useStrTab, strTable, depth + 1);
      if (!child || child._nextPos <= pos) break;

      pos = child._nextPos;
      if (child.key) obj[child.key] = child.value;
    }
    if (pos < endPos && buf[pos] === 8) pos++;
    return { key, value: obj, _nextPos: pos };
  } else {
    let val: any = null;
    switch (type) {
      case 1: {
        const start = pos;
        while (pos < endPos && buf[pos] !== 0) pos++;
        val = buf.toString("utf8", start, pos);
        if (pos < endPos && buf[pos] === 0) pos++;
        break;
      }
      case 2:
        if (pos + 4 <= endPos) {
          val = buf.readInt32LE(pos);
          pos += 4;
        }
        break;
      case 3:
        if (pos + 4 <= endPos) {
          val = buf.readFloatLE(pos);
          pos += 4;
        }
        break;
      case 7:
        if (pos + 8 <= endPos) {
          val = buf.readBigUInt64LE(pos);
          pos += 8;
        }
        break;
      default:
        break;
    }
    return { key, value: val, _nextPos: pos };
  }
}
