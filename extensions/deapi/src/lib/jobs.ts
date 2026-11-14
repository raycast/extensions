import type { DeapiClient, Model } from "./api";
import { voicesFor } from "./models";

export function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

function parseSeed(seed?: string): number {
  const value = Number.parseInt(seed ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : randomSeed();
}

export function generateImage(
  client: DeapiClient,
  params: { model: Model; prompt: string; width: number; height: number; seed?: string },
) {
  return client.submitJson("/images/generations", {
    prompt: params.prompt,
    model: params.model.slug,
    width: params.width,
    height: params.height,
    steps: params.model.info?.features?.supports_steps === false ? undefined : params.model.info?.defaults?.steps,
    seed: parseSeed(params.seed),
  });
}

export function editImage(
  client: DeapiClient,
  params: { model: Model; prompt: string; images: string[]; seed?: string },
) {
  const [first, ...rest] = params.images;
  const fields: Record<string, string | number | { file: string } | undefined> = {
    prompt: params.prompt,
    model: params.model.slug,
    steps: params.model.info?.defaults?.steps,
    seed: parseSeed(params.seed),
  };
  if (rest.length === 0) {
    fields.image = { file: first };
    return client.submitForm("/images/edits", fields);
  }
  // Several reference images go in `images[]`.
  return client.submitForm(
    "/images/edits",
    Object.fromEntries([
      ...Object.entries(fields),
      ...params.images.map((file, index) => [`images[${index}]`, { file }] as const),
    ]),
  );
}

export function generateVideo(
  client: DeapiClient,
  params: {
    model: Model;
    prompt: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    image?: string;
    seed?: string;
  },
) {
  const common = {
    prompt: params.prompt,
    model: params.model.slug,
    width: params.width,
    height: params.height,
    frames: params.frames,
    fps: params.fps,
    steps: params.model.info?.features?.supports_steps ? params.model.info?.defaults?.steps : undefined,
    seed: parseSeed(params.seed),
  };
  if (params.image) {
    return client.submitForm("/videos/animations", { ...common, first_frame_image: { file: params.image } });
  }
  return client.submitJson("/videos/generations", common);
}

export function generateSpeech(
  client: DeapiClient,
  params: { model: Model; text: string; voice?: string; speed?: number },
) {
  const defaults = params.model.info?.defaults ?? {};
  const voice = params.voice || defaults.voice;
  const lang = voicesFor(params.model).find((item) => item.id === voice)?.lang ?? defaults.lang ?? "en-us";
  return client.submitForm("/audio/speech", {
    text: params.text,
    model: params.model.slug,
    voice,
    lang,
    speed: params.speed ?? defaults.speed ?? 1,
    format: defaults.format ?? "mp3",
    sample_rate: defaults.sample_rate ?? 24000,
  });
}

export function transcribe(
  client: DeapiClient,
  params: { model: string; link?: string; file?: string; timestamps?: boolean },
) {
  return client.submitForm("/audio/transcriptions", {
    model: params.model,
    source_url: params.link,
    source_file: params.file ? { file: params.file } : undefined,
    include_ts: params.timestamps ?? false,
  });
}

export function removeBackground(client: DeapiClient, params: { model: string; image: string }) {
  return client.submitForm("/images/background-removals", { model: params.model, image: { file: params.image } });
}

export function upscaleImage(client: DeapiClient, params: { model: string; image: string }) {
  return client.submitForm("/images/upscales", { model: params.model, image: { file: params.image } });
}

/** Reads the text of a finished transcription, which comes inline or as a file. */
export async function transcriptionText(job: { result?: string | null; result_url?: string | null }): Promise<string> {
  if (job.result) return job.result;
  if (!job.result_url) return "";
  const response = await fetch(job.result_url);
  if (!response.ok) throw new Error(`Could not download the transcript (HTTP ${response.status}).`);
  return response.text();
}
