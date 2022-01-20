export function getGeohashShapeLink(geohash: string): string {
  return `https://www.geohash.es/decode?geohash=${geohash}`;
}

export function getLatLonLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
