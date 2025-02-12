import fetch from "cross-fetch";
import { getWindDirectionIcon } from "./icons";
import { UnitSystem, getTemperatureUnit, getUnitSystem, getWindUnit, getWttrWindPostfix } from "./unit";
import { clockFormat, getErrorMessage } from "./utils";

export interface Hourly {
  DewPointC: string;
  DewPointF: string;
  FeelsLikeC: string;
  FeelsLikeF: string;
  HeatIndexC: string;
  HeatIndexF: string;
  WindChillC: string;
  WindChillF: string;
  WindGustKmph: string;
  WindGustMiles: string;
  chanceoffog: string;
  chanceoffrost: string;
  chanceofhightemp: string;
  chanceofovercast: string;
  chanceofrain: string;
  chanceofremdry: string;
  chanceofsnow: string;
  chanceofsunshine: string;
  chanceofthunder: string;
  chanceofwindy: string;
  cloudcover: string;
  humidity: string;
  precipInches: string;
  precipMM: string;
  pressure: string;
  pressureInches: string;
  tempC: string;
  tempF: string;
  time: string;
  uvIndex: string;
  visibility: string;
  visibilityMiles: string;
  weatherCode: string;
  weatherDesc: Array<WeatherDesc>;
  winddir16Point: string;
  winddirDegree: string;
  windspeedKmph: string;
  windspeedMiles: string;
}

export interface WeatherDesc {
  value: string;
}

export interface WeatherConditions {
  humidity: string;
  temp_C: string;
  temp_F: string;
  pressure: string;
  pressureInches: string;
  cloudcover: string;
  FeelsLikeC: string;
  FeelsLikeF: string;
  uvIndex: string;
  visibility: string;
  visibilityMiles: string;
  weatherCode: string;
  weatherDesc: Array<WeatherDesc>;
  winddir16Point: string;
  winddirDegree: string;
  windspeedKmph: string;
  windspeedMiles: string;
  localObsDateTime?: string;
  precipMM?: string;
  precipInches?: string;
}

export interface AreaName {
  value: string;
}

export interface CountryName {
  value: string;
}

export interface RegionName {
  value: string;
}

export interface Area {
  areaName: Array<AreaName>;
  country: Array<CountryName>;
  region: Array<RegionName>;
  latitude: string | undefined;
  longitude: string | undefined;
  population: string | undefined;
}

export interface Astronomy {
  moon_illumination?: string;
  moon_phase?: string;
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherData {
  avgtempC: string;
  avgtempF: string;
  mintempC: string;
  mintempF: string;
  maxtempC: string;
  maxtempF: string;
  sunHour: string;
  totalSnow_cm?: string;
  uvIndex: string;
  date: string;
  hourly: Array<Hourly>;
  astronomy?: Astronomy[];
}

export interface Weather {
  current_condition: Array<WeatherConditions>;
  nearest_area: Array<Area>;
  weather: Array<WeatherData>;
}

function paramString(params: { [key: string]: string }): string {
  const p: string[] = [];
  for (const k in params) {
    const v = encodeURI(params[k]);
    p.push(`${k}=${v}`);
  }
  let prefix = "";
  if (p.length > 0) {
    prefix = "?";
  }
  return prefix + p.join("&");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toJsonOrError(response: Response): Promise<any> {
  const s = response.status;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getJson = async (): Promise<any> => {
    try {
      return await response.json();
    } catch (e: unknown) {
      throw Error(`Server-side issue at wttr.in (${s} - invalid json). Please try again later`);
    }
  };
  console.log(`status code: ${s}`);
  if (s >= 200 && s < 300) {
    const json = await getJson();
    return json;
  } else if (s == 401) {
    throw Error("Unauthorized");
  } else if (s == 403) {
    const json = await getJson();
    let msg = "Forbidden";
    if (json.error && json.error == "insufficient_scope") {
      msg = "Insufficient API token scope";
    }
    console.log(msg);
    throw Error(msg);
  } else if (s == 404) {
    throw Error("Not found");
  } else if (s >= 400 && s < 500) {
    const json = await getJson();
    console.log(json);
    const msg = json.message;
    throw Error(msg);
  } else if (s >= 500 && s < 600) {
    throw Error(`Server-side issue at wttr.in (${s}). Please try again later`);
  } else {
    console.log("unknown error");
    throw Error(`http status ${s}`);
  }
}

export class Wttr {
  private url = "https://wttr.in";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async fetch(city?: string, params: { [key: string]: string } = {}): Promise<any> {
    try {
      const ps = paramString(params);
      const fullUrl = this.url + "/" + (city ? city : "") + ps;
      console.log(`send GET request: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("response date header: ", response.headers.get("Date"));
      const json = await toJsonOrError(response);
      return json;
    } catch (error: unknown) {
      throw Error(getErrorMessage(error));
    }
  }

  public async getWeather(city?: string, language?: string | undefined): Promise<Weather> {
    // setting lang: "en" manipulate the e.g. kmph values
    const params: Record<string, string> = {
      format: "j1",
    };
    if (language && supportedLanguages.includes(language)) {
      params.lang = language;
    }
    return (await this.fetch(city, params)) as Weather;
  }
}

export const supportedLanguages: string[] = ["en", "de", "fr"];

export const wttr = new Wttr();

export function getCurrentFeelLikeTemperature(
  curcon: WeatherConditions | undefined,
): { value: string; unit: string; valueAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  const value = getUnitSystem() === UnitSystem.Imperial ? curcon.FeelsLikeF : curcon.FeelsLikeC;
  const unit = getTemperatureUnit();
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getCurrentUVIndex(curcon: WeatherConditions | undefined): string | undefined {
  if (!curcon) {
    return;
  }
  return curcon.uvIndex;
}

export function getCurrentHumidity(
  curcon: WeatherConditions | undefined,
): { value: string; unit: string; valueAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  if (!curcon.humidity) {
    return;
  }
  const unit = "%";
  return { unit, value: curcon.humidity, valueAndUnit: `${curcon.humidity} %` };
}

export function getCurrentWindConditions(
  curcon: WeatherConditions | undefined,
): { speed: string; unit: string; dirDeg: string; dirIcon: string; dirText: string } | undefined {
  if (!curcon) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speed: string | undefined = (curcon as any)[`windspeed${getWttrWindPostfix()}`];
  if (!speed) {
    return;
  }
  const unit = getWindUnit();
  const dirDeg = curcon.winddirDegree;
  if (!dirDeg) {
    return;
  }
  const dirIcon = getWindDirectionIcon(dirDeg) || "?";
  const dirText = curcon.winddir16Point;
  if (!dirText) {
    return;
  }
  return { speed, unit, dirDeg, dirIcon, dirText };
}

export function getCurrentVisibility(
  curcon: WeatherConditions | undefined,
): { unit: string; distance: string; distanceAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  const us = getUnitSystem();
  const distance = us === UnitSystem.Imperial ? curcon.visibilityMiles : curcon.visibility;
  const unit = us === UnitSystem.Imperial ? "Miles" : "Km";
  const distanceAndUnit = `${distance} ${unit}`;
  return { unit, distance, distanceAndUnit };
}

export function getAreaValues(
  area: Area | undefined,
):
  | { areaName?: string; country?: string; region?: string; latitude?: string; longitude?: string; population?: string }
  | undefined {
  if (!area) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStringVal = (obj: any[] | undefined): string | undefined => {
    if (obj === undefined) {
      return;
    }
    if (obj && obj.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (obj[0] as any).value;
    }
    return;
  };
  const areaName = getStringVal(area?.areaName);
  const country = getStringVal(area?.country);
  const region = getStringVal(area?.region);
  const latitude = area.latitude;
  const longitude = area.longitude;
  const population = area.population;

  return { areaName, country, region, latitude, longitude, population };
}

export function getCurrentPressure(
  curcon: WeatherConditions | undefined,
): { value: string; unit: string; valueAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  const us = getUnitSystem();
  const value: string | undefined = us === UnitSystem.Imperial ? curcon.pressureInches : curcon.pressure;
  if (!value) {
    return;
  }
  const unit = us === UnitSystem.Imperial ? "PSI" : "hPa";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getCurrentSun(weather: Weather | undefined): { sunrise: string; sunset: string } | undefined {
  if (!weather || !weather.weather || weather.weather.length <= 0) {
    return;
  }
  const today = weather.weather[0];
  if (!today.astronomy || today.astronomy.length <= 0) {
    return;
  }
  const a = today.astronomy[0];
  const sunrise = a.sunrise;
  const sunset = a.sunset;
  if (!sunrise || !sunset) {
    return;
  }
  return { sunrise, sunset };
}

export function getCurrentMoon(
  weather: Weather | undefined,
): { moonrise: string; moonset: string; moonPhase: string } | undefined {
  if (!weather || !weather.weather || weather.weather.length <= 0) {
    return;
  }
  const today = weather.weather[0];
  if (!today.astronomy || today.astronomy.length <= 0) {
    return;
  }
  const a = today.astronomy[0];
  const moonrise = a.moonrise;
  const moonset = a.moonset;
  const moonPhase = a.moon_phase;
  if (!moonrise || !moonset || !moonPhase) {
    return;
  }
  return { moonrise, moonset, moonPhase };
}

export function getCurrentTemperatureMinMax(
  weather: Weather | undefined,
): { minTemp: string; maxTemp: string } | undefined {
  if (!weather || !weather.weather || weather.weather.length <= 0) {
    return;
  }
  const us = getUnitSystem();
  const today = weather.weather[0];
  const minTemp: string | undefined = us === UnitSystem.Imperial ? today.mintempF : today.mintempC;
  if (!minTemp) {
    return;
  }
  const maxTemp: string | undefined = us === UnitSystem.Imperial ? today.maxtempF : today.maxtempC;
  if (!maxTemp) {
    return;
  }
  return { minTemp, maxTemp };
}

export function getCurrentSunHours(
  weather: Weather | undefined,
): { value: string; unit: string; valueAndUnit: string } | undefined {
  if (!weather || !weather.weather || weather.weather.length <= 0) {
    return;
  }
  const today = weather.weather[0];
  const value = today.sunHour;
  if (!value) {
    return;
  }
  const unit = "h";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getCurrentRain(
  curcon: WeatherConditions | undefined,
): { value: number; unit: string; valueAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  const us = getUnitSystem();
  const valueText: string | undefined = us === UnitSystem.Imperial ? curcon.precipInches : curcon.precipMM;

  if (!valueText) {
    return;
  }
  const value = Number(valueText);
  if (Number.isNaN(value)) {
    return;
  }
  const unit = us === UnitSystem.Imperial ? "Inches" : "mm";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getCurrentCloudCover(
  curcon: WeatherConditions | undefined,
): { value: number; unit: string; valueAndUnit: string } | undefined {
  if (!curcon) {
    return;
  }
  const valueText: string | undefined = curcon.cloudcover;
  if (!valueText) {
    return;
  }
  const value = Number(valueText);
  if (Number.isNaN(value)) {
    return;
  }
  const unit = "%";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getCurrentObservationTime(curcon: WeatherConditions | undefined): string | undefined {
  if (!curcon) {
    return;
  }
  return curcon.localObsDateTime;
}

export function getDaySnowInfo(day: WeatherData) {
  if (!day.totalSnow_cm) {
    return;
  }
  const totalSnowCm = day.totalSnow_cm ? Number(day.totalSnow_cm) : undefined;
  if (totalSnowCm === undefined || Number.isNaN(totalSnowCm)) {
    return;
  }
  const value = totalSnowCm;
  const unit = "cm";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getHourlyCloudCover(hour: Hourly | undefined) {
  if (!hour) {
    return;
  }
  const value = hour.cloudcover;
  if (!value) {
    return;
  }
  const unit = "%";
  const valueAndUnit = `${value} ${unit}`;
  return { value, unit, valueAndUnit };
}

export function getHourlyRain(hour: Hourly | undefined) {
  if (!hour) {
    return;
  }
  const us = getUnitSystem();
  const valueText = us === UnitSystem.Imperial ? hour.precipInches : hour.precipMM;
  if (!valueText) {
    return;
  }
  const value = Number(valueText);
  if (Number.isNaN(value)) {
    return;
  }
  const chanceOfRain = hour.chanceofrain;
  if (!chanceOfRain) {
    return;
  }
  const unit = us === UnitSystem.Imperial ? "Inches" : "mm";
  const valueAndUnit = `${valueText} ${unit}`;
  return { value, unit, valueAndUnit, chanceOfRain };
}

export function getHourlyThunder(hour: Hourly | undefined) {
  if (!hour) {
    return;
  }
  const valueText = hour.chanceofthunder;
  if (!valueText) {
    return;
  }
  const value = Number(valueText);
  if (Number.isNaN(value)) {
    return;
  }
  const unit = "%";
  const valueAndUnit = `${valueText} ${unit}`;
  return { value, unit, valueAndUnit };
}

/**
 * Convert the  given time to the user preferences time
 * @param text Can be 12 or 24 hour time like 11:00 PM, 11:00 AM or 11:00
 * @returns
 */
export function convertToTimeString(text: string) {
  const t = text.trim();
  if (clockFormat() === "12h") {
    return t;
  }
  if (t.endsWith("AM") || t.endsWith("PM")) {
    const d = new Date("1/1/2000 " + t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return t;
}
