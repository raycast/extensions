import type { Coords, Stop, StopWithDistance } from "../types";

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export function rankStopsByDistance(from: Coords, stops: Stop[]): StopWithDistance[] {
  return stops
    .map((s) => ({ ...s, distanceMeters: haversineMeters(from, { lat: s.lat, lng: s.lng }) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10;
    return `${rounded} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
