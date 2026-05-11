import { useMemo } from "react";
import { calculateCost, Model } from "../lib/OpenAI";

export default function useCost(model: Model, input: number, output: number): number {
  return useMemo(() => calculateCost(model, input, output), [model, input, output]);
}
