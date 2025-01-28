import type { ContainerStatStats } from "../types/container-stat";
import type { SystemStat } from "../types/system-stat";

/**
 * Calculate an average of a list of numbers
 * @param nums
 * @returns The average
 */
export const average = (nums: number[]): number => {
  if (nums.length === 0) {
    return 0;
  }

  return nums.reduce((a, b) => a + b) / nums.length;
};

/**
 * Calculate load average of the system (current: memory, cpu and docker)
 * @param stat
 * @returns 0 - 100
 */
export const getAverageSystemLoadPercentage = (stat: SystemStat) => {
  return average([stat.stats?.cpu, stat.stats?.mp, stat.stats?.dp].filter(Boolean));
};

/**
 * Calculate load average of a container (current: cpu only)
 * @param stat
 * @returns 0 - 100
 */
export const getAverageContainerLoadPercentage = (stat: ContainerStatStats) => {
  return average([stat.c].filter(Boolean));
};
