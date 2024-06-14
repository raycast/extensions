import { getPreferenceValues, environment } from "@raycast/api";
import { ActivityType, SportType } from "./api/types";

export const formatDuration = (duration: number) => {
  return new Date(duration * 1000).toISOString().substring(11, 19);
};

export const formatElevationGain = (elevationGain: number) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.distance_unit === "mi") {
    return `${(elevationGain * 3.28084).toFixed(0)}ft`;
  }
  return `${elevationGain}m`;
};

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

export function getStartOfWeekUnix() {
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);

  return Math.floor(weekStart.getTime() / 1000);
}

export function getSportTypesFromActivityTypes(
  activityTypes: ActivityType[],
  localized_sport_type: string,
): SportType[] {
  const sportTypes: SportType[] = [];
  if (activityTypes.includes(ActivityType.Ride)) {
    sportTypes.push(SportType.Ride);
    sportTypes.push(SportType.EBikeRide);
    sportTypes.push(SportType.EMountainBikeRide);
    sportTypes.push(SportType.VirtualRide);
    sportTypes.push(SportType.GravelRide);
  }
  if (activityTypes.includes(ActivityType.Run)) {
    sportTypes.push(SportType.Run);
    sportTypes.push(SportType.VirtualRun);
    sportTypes.push(SportType.TrailRun);
  }
  activityTypes.forEach((activityType) => {
    sportTypes.push(activityType as unknown as SportType);
  });
  sportTypes.push("localized_sport_type" as unknown as SportType);
  if (localized_sport_type == "Multisport") {
    Object.values(SportType).forEach((sportType) => {
      sportTypes.push(sportType);
    });
  }
  return sportTypes;
}
