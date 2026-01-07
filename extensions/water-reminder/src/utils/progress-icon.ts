import { Cache } from "@raycast/api";

const cache = new Cache();

export function getProgressIcon(percentage: number): string {
  const clampedPercentage = Math.min(Math.max(Math.round(percentage), 0), 100);
  const cacheKey = `progress-icon-v6-${clampedPercentage}`;

  // Check if we have a cached icon path
  const cachedPath = cache.get(cacheKey);
  if (cachedPath) {
    return cachedPath;
  }

  // Drop bounds: X: 28-72, Y: 24-84
  // We adjust viewBox to zoom in on the drop
  const viewBox = "18 22 64 64";
  const dropPath =
    "M50 24 C50 24 28 48 28 62 C28 74.15 37.85 84 50 84 C62.15 84 72 74.15 72 62 C72 48 50 24 50 24 Z";

  const svg = `
<svg width="64" height="64" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="water-fill" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="${clampedPercentage}%" stop-color="#000000" stop-opacity="1" />
            <stop offset="${clampedPercentage}%" stop-color="#000000" stop-opacity="0.15" />
        </linearGradient>
    </defs>

    <path
        d="${dropPath}"
        fill="url(#water-fill)"
        stroke="#000000"
        stroke-width="3"
        stroke-linejoin="round"
    />
</svg>
    `;

  const iconData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  // Cache the result
  cache.set(cacheKey, iconData);

  return iconData;
}
