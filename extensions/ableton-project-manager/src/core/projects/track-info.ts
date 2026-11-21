import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import type { Project } from "./types";
import { findLatestProjectBounce } from "./bounces";
import { analyzeAudio } from "./audio-analysis";
import {
  audioFileSignature,
  cacheAudioAnalysis,
  getCachedAudioAnalysisEntry,
  loadPersistentAudioAnalysisCache,
} from "./audio-cache";
import { daw, type DawSet, type ProjectFileMetadata } from "@/daws";
import {
  EMPTY_METADATA,
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "./project-file-cache";
import { LOG_PREFIX } from "@/core/log";

export type TrackInfo = {
  duration: number | null; // 秒，来自最新 bounce
  rms: number | null; // 0..1，整体响度
  crest: number | null; // 波峰因数 peak/rms，≥1，越小越密、能量越高
  brightness: number | null; // 0..1，频谱亮度（质心/Nyquist），越亮越有能量
  activity: number | null; // 0..1，spectral flux（活动量），越高越有能量
  bpm: number | null;
  key: string | null;
  timeSignature: string | null;
};

/** 代表这个项目的 Set：DAW 标了当前版本就用它，否则取最近修改的。 */
function primarySet(project: Project): DawSet | null {
  const sets = daw.listSets(project);
  const active = sets.find((set) => set.active);
  if (active) return active;
  return sets.reduce<DawSet | null>(
    (latest, set) => (latest === null || set.modifiedAt > latest.modifiedAt ? set : latest),
    null,
  );
}

/** 波峰因数 = 峰值 / RMS（≥1）；RMS 为 0 时无意义，返回 null。 */
function crestFactor(rms: number, peak: number): number | null {
  return rms > 0 ? peak / rms : null;
}

/** analyze 用 -1 表示 n/a，这里统一映射为 null。 */
function nonNegOrNull(value: number): number | null {
  return value >= 0 ? value : null;
}

async function loadAudioPart(project: Project): Promise<{
  duration: number | null;
  rms: number | null;
  crest: number | null;
  brightness: number | null;
  activity: number | null;
}> {
  const bouncePath = findLatestProjectBounce(project);
  if (!bouncePath) return { duration: null, rms: null, crest: null, brightness: null, activity: null };

  await loadPersistentAudioAnalysisCache();

  let signature: string;
  try {
    signature = audioFileSignature(fs.statSync(bouncePath));
  } catch {
    return { duration: null, rms: null, crest: null, brightness: null, activity: null };
  }

  const cached = getCachedAudioAnalysisEntry(bouncePath);
  if (cached && cached.signature === signature) {
    const { duration, rms, peak, centroid, flux } = cached.analysis;
    return {
      duration,
      rms,
      crest: crestFactor(rms, peak),
      brightness: nonNegOrNull(centroid),
      activity: nonNegOrNull(flux),
    };
  }

  try {
    const analysis = await analyzeAudio(bouncePath);
    try {
      if (audioFileSignature(fs.statSync(bouncePath)) === signature) {
        cacheAudioAnalysis(bouncePath, signature, analysis);
      }
    } catch {
      // 缓存校验失败不影响返回结果
    }
    return {
      duration: analysis.duration,
      rms: analysis.rms,
      crest: crestFactor(analysis.rms, analysis.peak),
      brightness: nonNegOrNull(analysis.centroid),
      activity: nonNegOrNull(analysis.flux),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to analyze bounce: ${bouncePath}`, error);
    return { duration: null, rms: null, crest: null, brightness: null, activity: null };
  }
}

async function loadSetPart(project: Project): Promise<ProjectFileMetadata> {
  const set = primarySet(project);
  if (!set) return EMPTY_METADATA;

  await loadPersistentProjectFileCache();

  const cached = cachedSetMetadata(set);
  if (cached) return cached;

  try {
    return await parseSetMetadata(set);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to parse set: ${set.metadataFile}`, error);
    return EMPTY_METADATA;
  }
}

/** 给一个项目加载它的 TrackInfo（最新 bounce + 代表 Set），全部走缓存。 */
export async function loadTrackInfo(project: Project): Promise<TrackInfo> {
  const [audio, set] = await Promise.all([loadAudioPart(project), loadSetPart(project)]);
  return {
    duration: audio.duration,
    rms: audio.rms,
    crest: audio.crest,
    brightness: audio.brightness,
    activity: audio.activity,
    bpm: set.bpm,
    key: set.key,
    timeSignature: set.timeSignature,
  };
}

/** 批量加载：限并发、可取消、每首算完即回调。 */
export async function loadTrackInfos(
  projects: Project[],
  onResult: (projectId: string, info: TrackInfo) => void,
  shouldCancel: () => boolean,
  concurrency = 3,
): Promise<void> {
  let nextIndex = 0;

  async function worker() {
    while (!shouldCancel()) {
      const index = nextIndex++;
      if (index >= projects.length) return;

      const project = projects[index];
      const info = await loadTrackInfo(project);

      if (shouldCancel()) return;
      onResult(project.id, info);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, () => worker()));
}

/** 本专辑某个特征的取值范围（min/max），用于把特征归一化到 0..1。 */
export type EnergyRange = { min: number; max: number };

/** 把一个值按范围线性归一到 0..1；范围无效（max<=min）时返回 0.5（居中）。 */
function normalize(value: number, range: EnergyRange): number {
  if (!(range.max > range.min)) return 0.5;
  const t = (value - range.min) / (range.max - range.min);
  return Math.max(0, Math.min(1, t));
}

// 能量特征权重：从扩展偏好读取（Off/Low/Normal/High = 0/0.5/1/2），模块加载时读一次。
// 权重是相对的：energyScore 会按总权重归一，所以只有三者之间的差值有意义；某项为 0 即关闭该特征。
function readWeight(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 1; // 缺失/非法回退到 Normal = 1
}

const energyPrefs = getPreferenceValues<Preferences>();
const ENERGY_WEIGHTS = {
  crest: readWeight(energyPrefs.weightCrest),
  brightness: readWeight(energyPrefs.weightBrightness),
  activity: readWeight(energyPrefs.weightActivity),
};

// 三个权重全为 0（都设 Off）→ 能量功能整体关闭，视图里不渲染能量圆点。
export const ENERGY_ENABLED = ENERGY_WEIGHTS.crest + ENERGY_WEIGHTS.brightness + ENERGY_WEIGHTS.activity > 0;

/**
 * 综合能量分（0..1）。波峰因数越小越密、能量越高，故取反；亮度、活动量越高能量越高，不取反。
 * 参与的特征按权重加权；缺某特征就跳过并对剩余权重重新归一；全缺则返回 null。
 */
export function energyScore(
  info: Pick<TrackInfo, "crest" | "brightness" | "activity">,
  crestRange: EnergyRange,
  brightnessRange: EnergyRange,
  activityRange: EnergyRange,
): number | null {
  let sum = 0;
  let totalWeight = 0;

  if (typeof info.crest === "number") {
    sum += ENERGY_WEIGHTS.crest * (1 - normalize(info.crest, crestRange));
    totalWeight += ENERGY_WEIGHTS.crest;
  }

  if (typeof info.brightness === "number") {
    sum += ENERGY_WEIGHTS.brightness * normalize(info.brightness, brightnessRange);
    totalWeight += ENERGY_WEIGHTS.brightness;
  }

  if (typeof info.activity === "number") {
    sum += ENERGY_WEIGHTS.activity * normalize(info.activity, activityRange);
    totalWeight += ENERGY_WEIGHTS.activity;
  }

  if (totalWeight === 0) return null;
  return sum / totalWeight;
}

/** 把 0..1 的能量分映射到 1–5 档。 */
export function energyLevelFromScore(score: number): number {
  return Math.max(1, Math.min(5, Math.round(1 + score * 4)));
}
