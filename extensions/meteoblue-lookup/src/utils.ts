import { Icon } from "@raycast/api";

export const formatTemperature = (
  temp: number | undefined,
  unit: string = "°C",
) => {
  if (temp === undefined || isNaN(temp)) return "N/A";
  return `${Math.round(temp)}${unit}`;
};

export const formatTemperatureRange = (
  temp: number | undefined,
  min: number | undefined,
  max: number | undefined,
  unit: string = "°C",
) => {
  if (temp !== undefined && !isNaN(temp)) {
    return formatTemperature(temp, unit);
  }

  if (min !== undefined && !isNaN(min) && max !== undefined && !isNaN(max)) {
    return `${Math.round(min)} - ${Math.round(max)}${unit}`;
  }

  if (max !== undefined && !isNaN(max)) {
    return formatTemperature(max, unit);
  }

  if (min !== undefined && !isNaN(min)) {
    return formatTemperature(min, unit);
  }

  return "N/A";
};

export const formatWindSpeed = (
  speed: number | undefined,
  unit: string = "km/h",
) => {
  if (speed === undefined || isNaN(speed)) return "N/A";
  return `${Math.round(speed)} ${unit}`;
};

export const formatWindSpeedDisplay = (
  speed: number | undefined,
  max: number | undefined,
  mean: number | undefined,
  unit: string = "km/h",
) => {
  if (speed !== undefined && !isNaN(speed)) {
    return formatWindSpeed(speed, unit);
  }

  if (max !== undefined && !isNaN(max)) {
    return formatWindSpeed(max, unit);
  }

  if (mean !== undefined && !isNaN(mean)) {
    return formatWindSpeed(mean, unit);
  }

  return "N/A";
};

export const formatPrecipitation = (
  precip: number | undefined,
  unit: string = "mm",
) => {
  if (precip === undefined || isNaN(precip)) return "0 " + unit;
  return `${precip.toFixed(1)} ${unit}`;
};

export const getWeatherIcon = (pictocode: number | undefined) => {
  if (pictocode === undefined) return Icon.QuestionMark;
  // Pictocode mapping (simplified)
  if (pictocode === 1) return Icon.Sun;
  if (pictocode >= 2 && pictocode <= 4) return Icon.Cloud;
  if (pictocode >= 5 && pictocode <= 8) return Icon.CloudRain;
  if (pictocode === 9) return Icon.CloudRain;
  return Icon.Cloud;
};
