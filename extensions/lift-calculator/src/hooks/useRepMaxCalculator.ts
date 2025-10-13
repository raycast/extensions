// hooks/useRepMaxCalculator.ts
import { useState, useEffect, useCallback } from "react";
import { MaxResult } from "../types/max";
import { calculateOneRepMax, generateResults, getErrorResult } from "../utils/calculations";
import { VALIDATION } from "../constants/shared";

export const useRepMaxCalculator = (initialWeight?: string, initialReps?: string) => {
  const [weight, setWeight] = useState(initialWeight || "");
  const [reps, setReps] = useState(initialReps || "");
  const [searchText, setSearchText] = useState(initialWeight && initialReps ? `${initialWeight}x${initialReps}` : "");
  const [results, setResults] = useState<MaxResult[]>([]);

  const calculateResults = useCallback(() => {
    // Clear results if either weight or reps is missing
    if (!weight || !reps) {
      setResults([]);
      return;
    }

    try {
      // Parse inputs
      const parsedWeight = parseFloat(weight);
      const parsedReps = parseInt(reps);

      // Validate inputs
      if (
        isNaN(parsedReps) ||
        isNaN(parsedWeight) ||
        parsedReps < VALIDATION.REPS.MIN ||
        parsedReps > VALIDATION.REPS.MAX ||
        parsedWeight <= 0 ||
        parsedWeight > VALIDATION.WEIGHT.MAX
      ) {
        setResults(getErrorResult());
        return;
      }

      // Calculate 1RM
      const repMax = calculateOneRepMax(parsedWeight, parsedReps);

      // Check for negative result
      if (repMax <= 0) {
        setResults(
          getErrorResult(
            "Calculation resulted in an invalid one-rep max. This can occur with unusual weight and rep combinations.",
          ),
        );
        return;
      }

      // Generate results
      const generatedResults = generateResults(repMax);

      // Update state
      setResults(generatedResults);
      setSearchText(`${weight}x${reps}`);
    } catch (error) {
      // Use getErrorResult for any calculation errors
      setResults(getErrorResult(error instanceof Error ? error.message : "Invalid input"));
    }
  }, [weight, reps]);

  // Calculate results when weight or reps change
  useEffect(() => {
    calculateResults();
  }, [weight, reps, calculateResults]);

  return {
    weight,
    setWeight,
    reps,
    setReps,
    searchText,
    setSearchText,
    results,
    calculateResults,
  };
};
