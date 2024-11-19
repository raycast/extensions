// utils/formatters.ts
import { ACTIVITY_COMPARISONS } from "./constants";

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === new Date(today.getTime() - 86400000).toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString();
};

export const getActivityComparison = (duration: number): string => {
  const durationInMinutes = duration / 60; // Convert seconds to minutes

  // Find the closest activity comparison
  const comparisons = ACTIVITY_COMPARISONS;
  let bestComparison = comparisons[0].activity;
  let closestTimeDifference = Math.abs(durationInMinutes - comparisons[0].time);
  let bestComparisonTimes = Math.floor(durationInMinutes / comparisons[0].time);

  comparisons.forEach(({ activity, time }) => {
    const timeDifference = Math.abs(durationInMinutes - time);
    const timesCompared = Math.floor(durationInMinutes / time);

    // Update if this activity is a better match
    if (
      timeDifference < closestTimeDifference ||
      (timeDifference === closestTimeDifference && timesCompared > bestComparisonTimes)
    ) {
      bestComparison = activity;
      closestTimeDifference = timeDifference;
      bestComparisonTimes = timesCompared;
    }
  });

  // If the duration is very short, return a special message
  if (durationInMinutes < 1) {
    return "Less than a minute";
  }

  // Return formatted comparison
  return bestComparisonTimes > 1 ? `${bestComparisonTimes}× ${bestComparison}` : bestComparison;
};

// Utility function to get relative time description
export const getRelativeTimeDescription = (timestamp: number): string => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return formatDate(timestamp);
};

// Format duration in a human-readable way
export const formatDurationHumanReadable = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (minutes === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours}h ${minutes}m`;
};
