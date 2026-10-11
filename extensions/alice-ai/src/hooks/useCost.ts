import { useMemo } from "react";
import { calculateCost, Model } from "../lib/OpenAI";

export default function useCost(model: Model, input: number, output: number, timestamp?: number): number {
  return useMemo(() => calculateCost(model, input, output, timestamp), [model, input, output, timestamp]);
}
