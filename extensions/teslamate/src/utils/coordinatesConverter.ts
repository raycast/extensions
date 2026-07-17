function lon2tile(long: number, zoom: number) {
  return Math.floor(((long + 180) / 360) * Math.pow(2, zoom));
}
function lat2tile(lat: number, zoom: number) {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

export function coordinatesConverter(long: number, lat: number) {
  const zoom = 16;
  const x = lat2tile(lat, zoom);
  const y = lon2tile(long, zoom);

  const tileImageUrl = `https://a.tile.openstreetmap.org/${zoom}/${y}/${x}.png`;

  return tileImageUrl;
}
