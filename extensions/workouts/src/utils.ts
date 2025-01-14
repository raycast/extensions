import { getPreferenceValues, environment, showToast, Toast } from "@raycast/api";
import { ActivityType, SportType } from "./api/types";
import { createWriteStream } from "fs";
import path from "path";

export const formatDuration = (duration: number) => {
  return new Date(duration * 1000).toISOString().substring(11, 19);
};

export const formatElevationGain = (elevationGain: number) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.distance_unit === "mi") {
    return `${(elevationGain * 3.28084).toFixed(0)}ft`;
  }
  return `${Math.round(elevationGain)}m`;
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
  if (!polyline) {
    return null;
  }

  const width = encodeURIComponent(860);
  const height = encodeURIComponent(360);
  const padding = encodeURIComponent("40,40,80");
  const poly = encodeURIComponent(polyline);
  const mapboxStyle = environment.appearance === "light" ? "outdoors-v12" : "dark-v11";
  return `https://extensions-api-proxy.raycast.com/mapbox/styles/v1/mapbox/${mapboxStyle}/static/path-5+f44-0.5(${poly})/auto/${width}x${height}?padding=${padding}`;
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

export function formatSportTypesText(input: string): string {
  input = input.replace(/(^E)([A-Z])/g, "E-$2");
  return input.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function convertDurationToSeconds(duration: string): number {
  const [hoursStr, minutesStr, secondsStr] = duration.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export function isDurationValid(
  duration: string | undefined,
): { hours: number; minutes: number; seconds: number } | null {
  if (!duration) return null;
  const regex = /^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/;
  const matches = duration.match(regex);
  if (matches) {
    const [, hoursStr, minutesStr, secondsStr] = matches;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const seconds = parseInt(secondsStr, 10);
    if (hours >= 0 && hours < 100 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
      return { hours, minutes, seconds };
    }
  }
  return null;
}

export function convertDistanceToMeters(distance: string, unit: string) {
  if (!distance) return "";
  const cleanedString = distance.trim();
  const value = parseFloat(cleanedString);
  switch (unit) {
    case "km":
      return value * 1000;
    case "mi":
      return value * 1609.344;
    default:
      throw new Error("Unsupported unit");
  }
}

export function isNumber(distance: string | undefined) {
  if (distance) {
    const sanitizedValue = distance.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    return !(sanitizedValue === "" || isNaN(Number(sanitizedValue)));
  }
}

export const saveFileToDesktop = (
  fileName: string,
  fileType: "gpx" | "tcx",
  fileStream: NodeJS.ReadableStream | null,
) => {
  if (fileStream) {
    const desktopDir = process.env.HOME + "/Desktop";
    const downloadPath = path.join(desktopDir, `${fileName}.${fileType}`);
    const writeStream = createWriteStream(downloadPath);
    fileStream.pipe(writeStream);
    writeStream.on("finish", () => {
      showToast({
        style: Toast.Style.Success,
        title: "Download successful",
        message: `${fileType.toUpperCase()} file saved to your desktop`,
      });
    });
    writeStream.on("error", () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Download failed",
        message: `Could not save the ${fileType.toUpperCase()} file.`,
      });
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Download failed",
      message: `Could not download the ${fileType.toUpperCase()} file.`,
    });
  }
};

export function parseFlexibleTime(timeStr: string): string | null {
  // Remove any whitespace
  timeStr = timeStr.trim().toLowerCase();

  // Handle HH:MM:SS format
  if (isDurationValid(timeStr)) {
    return timeStr;
  }

  // Handle HH:MM or MM:SS format
  const timePartMatch = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
  if (timePartMatch) {
    const [, part1, part2] = timePartMatch;
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);

    // If second number is >= 60, treat as HH:MM
    if (num2 >= 60) {
      return `${String(num1).padStart(2, "0")}:${String(num2).padStart(2, "0")}:00`;
    }

    // If first number >= 24, treat as MM:SS
    if (num1 >= 24) {
      const hours = Math.floor(num1 / 60);
      const minutes = num1 % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(num2).padStart(2, "0")}`;
    }

    // Default to HH:MM
    return `${String(num1).padStart(2, "0")}:${String(num2).padStart(2, "0")}:00`;
  }

  // Initialize time components
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  // Handle formats like "5h4m23s", "25min", "25m", etc.
  const hourMatch = timeStr.match(/(\d+)\s*h/);
  const minMatch = timeStr.match(/(\d+)\s*m(?:in)?(?!\s*s)/);
  const secMatch = timeStr.match(/(\d+)\s*s/);

  if (hourMatch) hours = parseInt(hourMatch[1]);
  if (minMatch) minutes = parseInt(minMatch[1]);
  if (secMatch) seconds = parseInt(secMatch[1]);

  // If no matches found, try parsing as pure minutes
  if (!hourMatch && !minMatch && !secMatch) {
    const numericValue = parseFloat(timeStr);
    if (!isNaN(numericValue)) {
      minutes = numericValue;
    } else {
      return null;
    }
  }

  // Convert to total seconds and format
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
