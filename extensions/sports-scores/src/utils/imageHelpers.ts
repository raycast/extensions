/**
 * Image helper utilities for team logos, player headshots, and colors
 */

import { Icon, Image, Color } from '@raycast/api';
import { Team } from '../types';

/**
 * Gets team logo image with fallback to icon
 * @param team - Team object with optional logo URL
 * @param fallbackIcon - Icon to use if logo unavailable (default: Icon.Circle)
 * @returns Image object or Icon
 */
export function getTeamLogoImage(team: Team, fallbackIcon: Icon = Icon.Circle): Image.ImageLike {
  if (team.logo) {
    return {
      source: team.logo,
      fallback: fallbackIcon,
    };
  }
  return fallbackIcon;
}

/**
 * Gets player headshot as circular image with fallback
 * @param headshotUrl - URL to player headshot
 * @param fallbackIcon - Icon to use if headshot unavailable (default: Icon.Person)
 * @returns Image object with circular mask or Icon
 */
export function getPlayerHeadshotImage(
  headshotUrl?: string,
  fallbackIcon: Icon = Icon.Person,
): Image.ImageLike {
  if (headshotUrl) {
    return {
      source: headshotUrl,
      mask: Image.Mask.Circle,
      fallback: fallbackIcon,
    };
  }
  return fallbackIcon;
}

/**
 * Gets team color as hex string with fallback
 * @param team - Team object with optional color field
 * @param fallbackColor - Raycast Color to use if team color unavailable
 * @returns Hex color string (with #) or Raycast Color
 */
export function getTeamColor(team: Team, fallbackColor: Color = Color.Blue): string | Color {
  if (team.color) {
    // ESPN colors are returned without the # prefix
    return `#${team.color}`;
  }
  return fallbackColor;
}

/**
 * Gets team logo as markdown image string
 * Useful for inserting logos into markdown content
 * @param team - Team object with optional logo URL
 * @param size - Image size in pixels (default: 20)
 * @returns Markdown image string or empty string
 */
export function getTeamLogoMarkdown(team: Team, size: number = 20): string {
  if (team.logo) {
    return `![${team.abbreviation}](${team.logo}?raycast-width=${size}&raycast-height=${size})`;
  }
  return '';
}

/**
 * Gets player headshot as markdown image string
 * @param headshotUrl - URL to player headshot
 * @param altText - Alt text for image
 * @param size - Image size in pixels (default: 100)
 * @returns Markdown image string or empty string
 */
export function getPlayerHeadshotMarkdown(
  headshotUrl: string | undefined,
  altText: string,
  size: number = 100,
): string {
  if (headshotUrl) {
    return `![${altText}](${headshotUrl}?raycast-width=${size}&raycast-height=${size})`;
  }
  return '';
}
