import { Persona } from "../types";

/**
 * Generate a persona icon with color and initials from API data
 * Sanitizes inputs to prevent SVG injection attacks
 */
export function getPersonaIcon(persona: Persona) {
  // Sanitize initials - only allow alphanumeric characters
  const rawInitials = persona.name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
  const initials = rawInitials.replace(/[^A-Z0-9]/g, "") || "P"; // Fallback to 'P' for persona

  // Validate and sanitize color - must be a valid hex color
  let color = "#2563eb"; // Default color
  if (persona.color) {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (hexColorRegex.test(persona.color)) {
      color = persona.color;
    }
  }

  // Create a simple SVG data URL with sanitized inputs
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="${color}"/>
    <text x="10" y="10" text-anchor="middle" dy="0.3em" fill="white" font-size="8" font-family="system-ui">${initials}</text>
  </svg>`;

  return {
    source: `data:image/svg+xml;base64,${btoa(svg)}`,
    tintColor: color,
  };
}
