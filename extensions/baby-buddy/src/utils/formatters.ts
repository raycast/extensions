/**
 * Utility functions for formatting data for display or API submission
 */

import axios from "axios";
import { DiaperEntry } from "../api";

/**
 * Formats an error message for display in toast notifications
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  // Handle axios errors
  if (axios.isAxiosError(error) && error.response?.data) {
    const errorData = error.response.data;

    if (typeof errorData === "string") {
      return errorData;
    }

    if (typeof errorData === "object" && errorData !== null) {
      // Extract error messages from object
      return Object.entries(errorData)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }

    return error.message;
  }

  // Handle generic errors with message property
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}

/**
 * Format a diaper entry for display
 */
export function formatDiaperDescription(diaper: DiaperEntry): string {
  const parts = [];

  // Build type description
  if (diaper.wet && diaper.solid) {
    parts.push("wet and solid");
  } else if (diaper.wet) {
    parts.push("wet");
  } else if (diaper.solid) {
    parts.push("solid");
  }

  // Add color if solid
  if (diaper.solid && diaper.color) {
    parts.push(`${diaper.color}`);
  }

  // Add amount if present
  if (diaper.amount) {
    parts.push(`amount: ${diaper.amount}`);
  }

  return parts.join(", ");
}

/**
 * Format a duration in minutes to a human-readable string
 */
export function formatMinutesToFullDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a child's age based on birth date
 */
export function formatAge(birthDate: string): string {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) {
    return "Invalid birth date";
  }
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
