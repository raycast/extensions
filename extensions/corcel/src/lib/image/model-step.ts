import { lerp } from "../math";
import { ImageGenerationModel } from "./types";

type Range = [number, number];

const ENGINE_TO_RANGE_MAP: Record<ImageGenerationModel, Range> = {
  dreamshaper: [6, 12],
  proteus: [6, 12],
  playground: [25, 51],
};

export const fromClientRangeToModelRange = (clientRangeValue: number, model: ImageGenerationModel) => {
  const engineRange = ENGINE_TO_RANGE_MAP[model];
  return Math.round(
    lerp(
      engineRange[0],
      engineRange[1],
      Math.min(Math.max(clientRangeValue, 0), 1), // Clamps value
    ),
  );
};
