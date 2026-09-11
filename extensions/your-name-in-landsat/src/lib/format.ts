import { TILE_META } from "./tiles";
import { isValidUrl, preferredTileUrl, tileLetter } from "./url";

export function buildLinksText(tileIds: string[]): string {
  return tileIds
    .map((id) => {
      const meta = TILE_META[id];
      const letter = tileLetter(id);
      if (!meta) return `${letter}: ${id}`;
      const url = preferredTileUrl(meta) ?? "";
      return `${letter} — ${meta.title}: ${url}`;
    })
    .join("\n");
}

export function buildCoordinatesText(tileIds: string[]): string {
  return tileIds
    .map((id) => {
      const meta = TILE_META[id];
      const letter = tileLetter(id);
      if (!meta) return `${letter}: ${id}`;
      const mapUrl = isValidUrl(meta.coordsUrl) ? meta.coordsUrl : "";
      return `${letter} — ${meta.title}: ${meta.coords}${mapUrl ? ` (${mapUrl})` : ""}`;
    })
    .join("\n");
}
