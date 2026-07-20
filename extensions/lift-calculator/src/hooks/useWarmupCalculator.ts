// hooks/useWarmupCalculator.ts
import { useState, useEffect, useCallback } from "react";
import { WarmupSet } from "../types/warmup";
import { calculateWarmupSets } from "../utils/warmup";
import { VALIDATION } from "../constants/shared";

export const useWarmupCalculator = (initialWeight?: string) => {
  const [weight, setWeight] = useState(initialWeight || "");
  const [sets, setSets] = useState<WarmupSet[]>([]);

  const calculateResults = useCallback(() => {
    // Clear sets if weight is missing
    if (!weight) {
      setSets([]);
      return;
    }

    try {
      // Parse input
      const parsedWeight = parseFloat(weight);

      // Validate inputs - updated to match other validations
      if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > VALIDATION.WEIGHT.MAX) {
        // Return empty sets for invalid input
        setSets([]);
        return;
      }

      // Calculate warmup sets
      const calculatedSets = calculateWarmupSets(parsedWeight);
      setSets(calculatedSets);
    } catch (error) {
      // Handle any unexpected errors by clearing sets
      setSets([]);
    }
  }, [weight]);

  // Calculate results when weight changes
  useEffect(() => {
    calculateResults();
  }, [weight, calculateResults]);

  return {
    weight,
    setWeight,
    sets,
    calculateResults,
  };
};
