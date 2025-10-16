import { AI, Cache } from "@raycast/api";
import RaycastApi from "raycast-backend-api";
import { useCachedState } from "@raycast/utils";
import { Detector, detect } from "raycast-language-detector";
import { Model } from "./types.js";

const api = new RaycastApi();
const cache = new Cache();

export const emptyResult = { languageCode: "", languageName: "Unknown" };

export const supportedDetectors: Detector[] = Object.values(Detector);

export const detectLanguage = async (text: string, detector: Detector, model: string) => {
  const detectors = supportedDetectors.slice().sort((a, b) => {
    if (a === detector) return -1;
    if (b === detector) return 1;
    if (detector !== Detector.AI && a === Detector.AI) return 1;
    if (detector !== Detector.AI && b === Detector.AI) return -1;
    return 0;
  });
  const result = await detect(text, {
    detectors,
    aiDetectOptions: model
      ? {
          aiAskOptions: {
            model: model as AI.Model,
          },
        }
      : undefined,
  }).catch(() => emptyResult);
  if (result) return result;
  return emptyResult;
};

export const getValidAiModels = async (): Promise<Model[]> => {
  const { models } = await api.aiModels();
  return models
    .filter((model) => !model.requires_better_ai && model.provider_brand !== "raycast")
    .map((model) => ({ id: model.id, name: model.name }));
};

export const useDetector = () => useCachedState<Detector>("selected-detector", Detector.AI);

export const useModel = () => useCachedState("selected-model", "default");

export const getCachedDetector = () => {
  const cached = cache.get("selected-detector");
  const fallback = Detector.AI;
  try {
    const detector = cached ? (JSON.parse(cached) as Detector) : fallback;
    return detector;
  } catch {
    return fallback;
  }
};

export const getCachedModel = () => {
  const cached = cache.get("selected-model");
  const fallback = "default";
  try {
    const model = cached ? (JSON.parse(cached) as Detector) : fallback;
    return model;
  } catch {
    return fallback;
  }
};
