// hooks/useVolumeCalculator.ts
import { useState, useEffect, useCallback } from "react";
import { VolumeResult } from "../types/volume";
import { calculateVolume } from "../utils/volume";
import { VALIDATION } from "../constants/shared";

export const useVolumeCalculator = (initialWeight?: string) => {
  const [weight, setWeight] = useState(initialWeight || "");
  const [results, setResults] = useState<VolumeResult[]>([]);

  const calculateResults = useCallback(() => {
    // Clear results if weight is missing
    if (!weight) {
      setResults([]);
      return;
    }

    try {
      // Parse input
      const parsedWeight = parseFloat(weight);

      // Validate inputs
      if (isNaN(parsedWeight) || parsedWeight < VALIDATION.WEIGHT.MIN || parsedWeight > VALIDATION.WEIGHT.MAX) {
        // Return empty results for invalid input
        setResults([]);
        return;
      }

      // Calculate volume schemes
      const volumeResults = calculateVolume(parsedWeight);
      setResults(volumeResults);
    } catch (error) {
      // Handle any unexpected errors by clearing results
      setResults([]);
    }
  }, [weight]);

  // Calculate results when weight changes
  useEffect(() => {
    calculateResults();
  }, [weight, calculateResults]);

  return {
    weight,
    setWeight,
    results,
    calculateResults,
  };
};
