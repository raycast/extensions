import { Image } from "@raycast/api";

export type TargetModeKey = string;
export type OpenaiApiKey = string;

export type TargetModeInfo = {
  key: TargetModeKey;
  title: string;
  icon: Image.ImageLike;
  description: string;
  executionContext: string;
};
