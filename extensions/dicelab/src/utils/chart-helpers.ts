// Chart data preparation helpers for PMF visualization

import type { PMFData } from "./pmf";
import type { ChartData } from "./svg-chart";
import { DATASET_COLORS } from "./svg-chart";

/**
 * Builds combined chart data for multiple PMFs
 * Mirrors the Web UI's buildCombinedChartData algorithm
 */
export function buildCombinedChartData(pmfs: PMFData[]): ChartData {
  // 1. Collect all unique values across all PMFs
  const allValuesSet = new Set<string>();
  pmfs.forEach((pmf) => {
    pmf.bins.forEach((bin) => {
      allValuesSet.add(bin.label);
    });
  });

  // 2. Sort values numerically
  const allValues = Array.from(allValuesSet).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  // 3. Build datasets for each PMF
  const datasets = pmfs.map((pmf, index) => {
    const colorScheme = DATASET_COLORS[index % DATASET_COLORS.length];

    // Create probability map for this PMF
    const probMap = new Map<string, number>();
    pmf.bins.forEach((bin) => {
      probMap.set(bin.label, Number(bin.probability || 0));
    });

    // Fill data array (0 for missing values)
    const data = allValues.map((value) => probMap.get(value) || 0);

    return {
      label: `Distribution #${index + 1}`,
      data,
      backgroundColor: colorScheme.bg,
      borderColor: colorScheme.border,
    };
  });

  return {
    labels: allValues,
    datasets,
  };
}
