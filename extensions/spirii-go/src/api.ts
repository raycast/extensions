export const API_BASE = "https://app.spirii.dk/api";

export const locationsUrl = (lat: number, lon: number) =>
  `${API_BASE}/v2/locations?lat=${lat}&lon=${lon}`;

export const evseUrl = (evseId: string, platform = "spirii") =>
  `${API_BASE}/evse/${encodeURIComponent(evseId)}?platform=${platform}`;

export const locationDetailUrl = (locationId: string) =>
  `${API_BASE}/v2/location/${encodeURIComponent(locationId)}`;
