import { TAspectRatio, TModelId, TModelName, TNumOutputs } from "@ts/constants";

export interface TGenerationCreateResult {
  outputs: TGenerationCreationOutput[];
  remaining_credits: number;
  settings: {
    model_id: TModelId;
    width: number;
    height: number;
    guidance_scale: number;
    seed: number;
  };
  error?: string;
}

export interface TGenerationCreationOutput {
  id: string;
  url: string;
}

export interface TUpscaleCreateResult {
  outputs: TUpscaleCreationOutput[];
  remaining_credits: number;
  error?: string;
}

export interface TUpscaleCreationOutput {
  id: string;
  url: string;
}

export interface TGalleryPage {
  next?: string;
  outputs: TOutput[];
}

export interface TOutput {
  id: string;
  image_url: string;
  upscaled_image_url?: string;
  generation: {
    prompt: {
      text: string;
    };
    width: number;
    height: number;
    guidance_scale: number;
    model_id: TModelId;
  };
}

export interface TOutputHistory {
  id: string;
  image_url: string;
  upscaled_image_url: string;
  generation: {
    prompt: {
      text: string;
    };
    width: number;
    height: number;
    guidance_scale: number;
    model_id: TModelId;
  };
}

export interface TUpscaleFormValues {
  images: string[];
}

export interface TGenerationFormValues {
  prompt: string;
  model: TModelName;
  aspect_ratio: TAspectRatio;
  num_outputs: TNumOutputs;
}

export type THistoryFilter = "all" | "favorites";
