import { getPreferenceValues, environment } from "@raycast/api";
import { ActivityType } from "./api/types";

export const formatDistance = (distance: number) => {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.distance_unit === "km") {
    return `${(distance / 1000).toFixed(1)} km`;
  } else {
    return `${(distance / 1609.34).toFixed(2)} mi`;
  }
};

export const formatSpeedForSportType = (sportType: ActivityType, speed: number) => {
  const preferences = getPreferenceValues<Preferences>();

  if (speed === 0) {
    return "";
  }

  switch (sportType) {
    case "Run": {
      const pace = 1 / (speed * 0.06);
      if (preferences.distance_unit === "km") {
        return `${Math.floor(pace)}:${Math.floor((pace % 1) * 60)
          .toString()
          .padStart(2, "0")}min/km`;
      } else {
        const paceMiles = pace * 1.60934;
        return `${Math.floor(paceMiles)}’${Math.floor((paceMiles % 1) * 60)
          .toString()
          .padStart(2, "0")}” min/mile`;
      }
    }
    default:
      if (preferences.distance_unit === "km") {
        return `${(speed * 3.6).toFixed(1)} km/h`;
      } else {
        return `${(speed * 2.23694).toFixed(1)} mph`;
      }
  }
};

export const generateMapboxImage = (polyline: string) => {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.mapbox_access_token || !polyline) {
    return null;
  }

  const width = encodeURIComponent(860);
  const height = encodeURIComponent(360);
  const padding = encodeURIComponent("40,40,80");
  const poly = encodeURIComponent(polyline);
  const mapboxStyle = environment.appearance === "light" ? "outdoors-v12" : "dark-v11";
  return `https://api.mapbox.com/styles/v1/mapbox/${mapboxStyle}/static/path-5+f44-0.5(${poly})/auto/${width}x${height}?padding=${padding}&access_token=${preferences.mapbox_access_token}`;
};
