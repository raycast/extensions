// Re-export all unit conversion related functions and constants from unitConversions
export * from "./unitConversions";

/**
 * Renders star rating as text (e.g., "★★★★☆" for 4.0)
 * @param rating Rating value (0-5)
 * @returns Formatted star rating as string
 */
export function renderStarRating(rating: number | undefined): string {
  if (rating === undefined) return "No Rating";

  // Validate that rating is between 0-5
  if (rating < 0 || rating > 5) {
    console.warn(`Invalid rating value: ${rating}. Expected value between 0-5.`);
    return "Rating not available";
  }

  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);
}

/**
 * Format price level as dollar signs
 * @param level Price level (0-4)
 * @returns Formatted price level as string
 */
export function formatPriceLevel(level?: number): string {
  if (level === undefined) return "Price not available";

  // Validate that level is between 0-4
  if (level < 0 || level > 4 || !Number.isInteger(level)) {
    console.warn(`Invalid price level: ${level}. Expected integer between 0-4.`);
    return "Price not available";
  }

  return level === 0 ? "Free" : "$".repeat(level);
}

/**
 * Format rating with different display options
 * @param rating Rating value
 * @param format Format option: 1 = "4.8 ★★★★★ (58)", 2 = "★★★★☆ (4.0)", 3 = "★★★★☆"
 * @param totalRatings Total number of ratings (only used in format 1)
 * @returns Formatted rating string
 * @throws Error if format is not 1, 2, or 3
 */
export function formatRating(rating?: number, format: 1 | 2 | 3 = 2, totalRatings?: number): string {
  if (rating === undefined) return "No ratings yet";

  // Validate rating is within a reasonable range
  if (rating < 0 || rating > 5) {
    console.warn(`Invalid rating value: ${rating}. Expected value between 0-5.`);
    return "Invalid rating";
  }

  const stars = renderStarRating(rating);

  let formattedRating: string;

  switch (format) {
    case 1: // Overall rating average, stars, (Total Ratings Count)
      formattedRating = `${rating.toFixed(1)} ${stars}${totalRatings ? ` (${totalRatings})` : ""}`;
      break;
    case 2: // Stars, Rating
      formattedRating = `${stars} (${rating.toFixed(1)})`;
      break;
    case 3: // Stars only
      formattedRating = stars;
      break;
    default:
      // This should never happen due to TypeScript's type checking,
      // but we handle it anyway for runtime safety
      console.error(`Invalid format: ${format}. Expected 1, 2, or 3.`);
      throw new Error(`Invalid format: ${format}. Expected 1, 2, or 3.`);
  }

  return formattedRating;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point (-90 to 90)
 * @param lon1 Longitude of first point (-180 to 180)
 * @param lat2 Latitude of second point (-90 to 90)
 * @param lon2 Longitude of second point (-180 to 180)
 * @returns Distance in kilometers
 * @throws Error if any coordinate is outside its valid range
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Validate latitude values (-90 to 90)
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    const invalidLat = lat1 < -90 || lat1 > 90 ? lat1 : lat2;
    const errorMsg = `Invalid latitude value: ${invalidLat}. Latitude must be between -90 and 90 degrees.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate longitude values (-180 to 180)
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    const invalidLon = lon1 < -180 || lon1 > 180 ? lon1 : lon2;
    const errorMsg = `Invalid longitude value: ${invalidLon}. Longitude must be between -180 and 180 degrees.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Earth's mean radius in kilometers (WGS84 ellipsoid)
  const EARTH_RADIUS_KM = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c; // Distance in km
  return distance;
}
