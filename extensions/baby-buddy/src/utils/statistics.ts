/**
 * Utility functions for calculating statistics and metrics
 */

import { DiaperEntry, FeedingEntry, SleepEntry, TummyTimeEntry } from "../api";

/**
 * Calculate total feeding amount
 */
export function calculateTotalFeedingAmount(feedings: FeedingEntry[]): number {
  return feedings.reduce((total, feeding) => {
    return total + (feeding.amount || 0);
  }, 0);
}

/**
 * Calculate total sleep duration in minutes
 */
export function calculateTotalSleepMinutes(sleep: SleepEntry[]): number {
  return sleep.reduce((total, entry) => {
    // Parse the duration string (format: "HH:MM:SS")
    const [hours, minutes, seconds] = entry.duration.split(":").map(Number);
    return Math.round(total + (hours * 60 + minutes + seconds / 60));
  }, 0);
}

/**
 * Calculate total tummy time duration in minutes
 */
export function calculateTotalTummyTimeMinutes(tummyTime: TummyTimeEntry[]): number {
  return tummyTime.reduce((total, entry) => {
    // Parse the duration string (format: "HH:MM:SS")
    const [hours, minutes] = entry.duration.split(":").map(Number);
    return total + (hours * 60 + minutes);
  }, 0);
}

/**
 * Count wet diapers
 */
export function countWetDiapers(diapers: DiaperEntry[]): number {
  return diapers.filter((diaper) => diaper.wet).length;
}

/**
 * Count solid diapers
 */
export function countSolidDiapers(diapers: DiaperEntry[]): number {
  return diapers.filter((diaper) => diaper.solid).length;
}

/**
 * Calculate total diaper amount
 */
export function calculateTotalDiaperAmount(diapers: DiaperEntry[]): number {
  return diapers.reduce((total, diaper) => {
    return total + (diaper.amount || 0);
  }, 0);
}

/**
 * Calculate age in years and months
 */
export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();

  // Calculate difference in milliseconds
  const diffMs = now.getTime() - birth.getTime();

  // Convert to days
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 30) {
    return `${days} days`;
  }

  // Convert to months
  const months = Math.floor(days / 30.44);

  if (months < 24) {
    return `${months} months`;
  }

  // Convert to years
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} years`;
  }

  return `${years} years, ${remainingMonths} months`;
}
