import type { Model, ModelLimits } from "./api";

/** Models we suggest first, in this order, when they are available to the account. */
const PREFERRED: Record<string, string[]> = {
  txt2img: ["ZImageTurbo_INT8", "Flux1schnell", "Flux_2_Klein_4B_BF16"],
  img2img: ["Flux_2_Klein_4B_BF16", "QwenImageEdit_Plus_NF4"],
  video: ["Ltx2_5_22B_Dist_INT8", "MiniMaxH3_33B_Turbo_INT8"],
  txt2audio: ["Kokoro", "Qwen3_TTS_12Hz_1_7B_CustomVoice", "Chatterbox"],
  transcription: ["WhisperLargeV3", "WhisperLargeV3Ct2"],
  "img-rmbg": ["Ben2"],
  "img-upscale": ["RealESRGAN_x4"],
};

/** TTS models that need inputs this extension does not collect (a reference recording or a voice description). */
const UNSUPPORTED_TTS = ["Qwen3_TTS_12Hz_1_7B_Base", "Qwen3_TTS_12Hz_1_7B_VoiceDesign"];

/**
 * Sorts models so the preferred ones come first, then standard models, then test or external ones.
 */
export function sortModels(models: Model[], group: keyof typeof PREFERRED): Model[] {
  const preferred = PREFERRED[group] ?? [];
  const rank = (model: Model) => {
    const index = preferred.indexOf(model.slug);
    if (index >= 0) return index;
    return model.status === "standard_model" ? preferred.length : preferred.length + 1;
  };
  return [...models].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function speechModels(models: Model[]): Model[] {
  return sortModels(
    models.filter((model) => !UNSUPPORTED_TTS.includes(model.slug)),
    "txt2audio",
  );
}

export interface AspectRatio {
  id: string;
  title: string;
  ratio: number;
}

export const ASPECT_RATIOS: AspectRatio[] = [
  { id: "1:1", title: "Square (1:1)", ratio: 1 },
  { id: "16:9", title: "Landscape (16:9)", ratio: 16 / 9 },
  { id: "9:16", title: "Portrait (9:16)", ratio: 9 / 16 },
  { id: "4:3", title: "Landscape (4:3)", ratio: 4 / 3 },
  { id: "3:4", title: "Portrait (3:4)", ratio: 3 / 4 },
];

/**
 * Picks a width and height for an aspect ratio that the model accepts: about as many pixels as the
 * model's default size, rounded to the model's size step and kept within its limits.
 */
export function sizeForAspectRatio(model: Model, ratio: number): { width: number; height: number } {
  const limits: ModelLimits = model.info?.limits ?? {};
  const defaults = model.info?.defaults ?? {};
  const step = limits.dimension_multiple || limits.resolution_step || 16;
  const defaultWidth = defaults.width ?? 768;
  const defaultHeight = defaults.height ?? 768;

  const maxRatio = limits.max_ratio ?? Infinity;
  const clampedRatio = Math.min(Math.max(ratio, 1 / maxRatio), maxRatio);

  let pixels = defaultWidth * defaultHeight;
  if (limits.max_pixels) pixels = Math.min(pixels, limits.max_pixels);

  let width = Math.sqrt(pixels * clampedRatio);
  let height = width / clampedRatio;

  const minWidth = Math.max(limits.min_width ?? 0, limits.min_side ?? 0);
  const minHeight = Math.max(limits.min_height ?? 0, limits.min_side ?? 0);
  const maxWidth = Math.min(limits.max_width ?? Infinity, limits.max_side ?? Infinity);
  const maxHeight = Math.min(limits.max_height ?? Infinity, limits.max_side ?? Infinity);

  // Grow or shrink both sides together so the ratio survives the limits where it can.
  const grow = Math.max(minWidth / width, minHeight / height, 1);
  width *= grow;
  height *= grow;
  const shrink = Math.min(maxWidth / width, maxHeight / height, 1);
  width *= shrink;
  height *= shrink;

  const round = (value: number, min: number, max: number) => {
    let rounded = Math.round(value / step) * step;
    while (rounded < min) rounded += step;
    while (rounded > max) rounded -= step;
    return Math.max(rounded, step);
  };
  width = round(width, minWidth, maxWidth);
  height = round(height, minHeight, maxHeight);

  if (limits.max_pixels) {
    while (width * height > limits.max_pixels && width > step && height > step) {
      if (width >= height) width -= step;
      else height -= step;
    }
  }
  return { width, height };
}

export interface VideoDuration {
  seconds: number;
  frames: number;
  fps: number;
}

/** Lists the whole-second lengths a video model supports, with the frame count to request for each. */
export function videoDurations(model: Model): VideoDuration[] {
  const limits = model.info?.limits ?? {};
  const defaults = model.info?.defaults ?? {};
  const fps = Math.min(Math.max(defaults.fps ?? 24, limits.min_fps ?? 1), limits.max_fps ?? 120);
  const minFrames = limits.min_frames ?? defaults.frames ?? fps * 5;
  const maxFrames = limits.max_frames ?? defaults.frames ?? fps * 5;

  const durations: VideoDuration[] = [];
  const firstSecond = Math.max(1, Math.ceil(minFrames / fps));
  const lastSecond = Math.max(firstSecond, Math.floor(maxFrames / fps));
  for (let seconds = firstSecond; seconds <= lastSecond; seconds++) {
    const frames = Math.min(Math.max(seconds * fps, minFrames), maxFrames);
    durations.push({ seconds, frames, fps });
  }
  return durations;
}

export function defaultVideoDuration(model: Model): VideoDuration {
  const durations = videoDurations(model);
  const defaultFrames = model.info?.defaults?.frames;
  if (defaultFrames) {
    const closest = durations.reduce((best, item) =>
      Math.abs(item.frames - defaultFrames) < Math.abs(best.frames - defaultFrames) ? item : best,
    );
    if (closest) return closest;
  }
  return durations[0];
}

export interface Voice {
  id: string;
  title: string;
  lang?: string;
}

const KOKORO_LANGUAGES: Record<string, { code: string; title: string }> = {
  a: { code: "en-us", title: "American English" },
  b: { code: "en-gb", title: "British English" },
  e: { code: "es", title: "Spanish" },
  f: { code: "fr-fr", title: "French" },
  h: { code: "hi", title: "Hindi" },
  i: { code: "it", title: "Italian" },
  p: { code: "pt-br", title: "Brazilian Portuguese" },
};

const KOKORO_VOICES = [
  "af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  "bf_alice",
  "bf_emma",
  "bf_isabella",
  "bf_lily",
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
  "ef_dora",
  "em_alex",
  "em_santa",
  "ff_siwis",
  "hf_alpha",
  "hf_beta",
  "hm_omega",
  "hm_psi",
  "if_sara",
  "im_nicola",
  "pf_dora",
  "pm_alex",
  "pm_santa",
];

const QWEN_CUSTOM_VOICES = ["Vivian", "Serena", "Uncle_Fu", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"];

/** Returns the voices a TTS model offers. Kokoro voices carry their language, which the API needs. */
export function voicesFor(model: Model): Voice[] {
  if (model.slug === "Kokoro") {
    return KOKORO_VOICES.map((id) => {
      const language = KOKORO_LANGUAGES[id[0]];
      const name = id.slice(3);
      const gender = id[1] === "f" ? "female" : "male";
      return {
        id,
        title: `${name[0].toUpperCase()}${name.slice(1)} (${language.title}, ${gender})`,
        lang: language.code,
      };
    });
  }
  if (model.slug === "Qwen3_TTS_12Hz_1_7B_CustomVoice") {
    return QWEN_CUSTOM_VOICES.map((id) => ({ id, title: id.replace("_", " ") }));
  }
  const voice = model.info?.defaults?.voice ?? "default";
  return [{ id: voice, title: "Default voice" }];
}

export function speedRange(model: Model): { min: number; max: number } {
  const limits = model.info?.limits ?? {};
  return { min: limits.min_speed ?? 1, max: limits.max_speed ?? 1 };
}

export const TRANSCRIPTION_LINK_HOSTS = [
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "twitch.tv",
  "kick.com",
];

export function isSupportedLink(value: string): boolean {
  try {
    const host = new URL(value).hostname.replace(/^www\.|^m\./, "");
    return TRANSCRIPTION_LINK_HOSTS.some((supported) => host === supported || host.endsWith(`.${supported}`));
  } catch {
    return false;
  }
}

export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi", "m4v"];

export function isVideoFile(path: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.split(".").pop()?.toLowerCase() ?? "");
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
export const IMAGE_FILE_ERROR = "Use a PNG, JPG or WEBP image";

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.split(".").pop()?.toLowerCase() ?? "");
}
