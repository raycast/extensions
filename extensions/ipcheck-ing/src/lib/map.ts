// Esri's ArcGIS Online export endpoint renders a basemap image for a bounding box with no
// API key. It is used over the OSM tile server because a tile is snapped to a fixed grid —
// the location would sit somewhere inside it rather than at the centre, which is misleading
// on a map with no marker. A bbox lets us centre exactly on the reported coordinates.
const BASEMAP = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export";

const WIDTH = 640;
const HEIGHT = 360;

/** Height of the view in degrees of latitude — roughly a "which region is this" zoom. */
const LATITUDE_SPAN = 2.4;

export const MAP_ATTRIBUTION = "Map tiles © Esri — centered on the reported coordinates";

/**
 * The URL goes straight into the markdown for Raycast to load. The image is deliberately not
 * fetched and cached by us: the same coordinates always produce the same URL, so there is
 * nothing to gain over Raycast's own image loading.
 */
export function staticMapURL(lat: number, lon: number): string {
  // Degrees of longitude shrink towards the poles, so the bbox has to be widened by
  // 1/cos(latitude) for the image not to come out stretched.
  const latitudeRadians = (Math.min(Math.abs(lat), 85) * Math.PI) / 180;
  const longitudeSpan = (LATITUDE_SPAN * (WIDTH / HEIGHT)) / Math.max(Math.cos(latitudeRadians), 0.05);

  const bbox = [lon - longitudeSpan / 2, lat - LATITUDE_SPAN / 2, lon + longitudeSpan / 2, lat + LATITUDE_SPAN / 2];

  const params = new URLSearchParams({
    bbox: bbox.map((value) => value.toFixed(4)).join(","),
    bboxSR: "4326",
    size: `${WIDTH},${HEIGHT}`,
    format: "jpg",
    transparent: "false",
    f: "image",
  });

  return `${BASEMAP}?${params.toString()}`;
}
