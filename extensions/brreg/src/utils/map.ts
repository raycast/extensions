/**
 * Convert geographic coordinates to an OpenStreetMap tile URL.
 */
export function getMapTileUrl(lat: number, lon: number, zoom: number): string {
  const n = Math.pow(2, zoom);
  const xTile = Math.floor(((lon + 180) / 360) * n);
  const yTile = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
  );
  return `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;
}
