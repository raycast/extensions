// Cast — the weather fox. A modular, pure-SVG mascot scene system with native
// SMIL animation (Raycast's markdown renderer plays it).
//
// This module owns the scene model: deriving conditions from a forecast,
// choosing which activity Cast is up to, and composing the
// final SVG from the fox / stage / activity modules. No Raycast imports, so
// dev scripts can render the whole scene family for visual inspection.

import { Forecast, GeoResult, formatPlace } from "./api";
import { moonInfo } from "./astro";
import { friendlyDate, hourOf, isoToDate, nowHourIndex, placeLocalIso } from "./build";
import { kindFor, labelFor } from "./palettes";
import { aScale, animated } from "./cast-anim";
import { CAST, CAST_PANEL_WIDTH, CastScene, FONT, GROUND_Y, H, W, escapeXml } from "./cast-core";
import { ACTIVITIES, candidateActivities, routineActivity, Stage } from "./cast-acts";
import { ambientOverlay, celestial, groundFor, seasonDecor, skyClouds, skyFor, stars } from "./cast-stage";

export type { CastScene } from "./cast-core";

// ---------------------------------------------------------------------------
// Deriving scene conditions from the forecast
// ---------------------------------------------------------------------------

const HEAVY_RAIN_CODES = new Set([65, 67, 82]);
const FREEZING_CODES = new Set([56, 57, 66, 67]);
/** US AQI "Unhealthy" and above. */
const HAZY_AQI = 150;

function toCastWeather(code: number, windSpeed: number, metric: boolean): CastScene["weather"] {
  const kind = kindFor(code);
  const windy = windSpeed >= (metric ? 30 : 19);
  switch (kind) {
    case "sun":
      return windy ? "wind" : "clear";
    case "partly":
      return windy ? "wind" : "partly";
    case "cloudy":
      return windy ? "wind" : "cloudy";
    case "moon":
      return "clear";
    case "rain":
      return HEAVY_RAIN_CODES.has(code) ? "heavyRain" : "rain";
    default:
      return kind;
  }
}

function seasonOf(date: Date, latitude: number): CastScene["season"] {
  const m = date.getMonth();
  const north: CastScene["season"] = m <= 1 || m === 11 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
  if (latitude >= 0) return north;
  const flip: Record<CastScene["season"], CastScene["season"]> = {
    winter: "summer",
    spring: "autumn",
    summer: "winter",
    autumn: "spring",
  };
  return flip[north];
}

function feelOf(apparent: number, metric: boolean): CastScene["feel"] {
  if (apparent <= (metric ? 3 : 37)) return "cold";
  if (apparent >= (metric ? 28 : 82)) return "hot";
  return "mild";
}

/** Minutes since midnight; NaN when the value is missing (polar day/night), which fails every phase test below. */
function minutesOf(iso: string | null | undefined): number {
  if (typeof iso !== "string" || iso.length < 16) return NaN;
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function phaseOf(nowIso: string, sunriseIso: string, sunsetIso: string, isDay: boolean): CastScene["phase"] {
  const now = minutesOf(nowIso);
  if (Math.abs(now - minutesOf(sunriseIso)) <= 45) return "sunrise";
  if (Math.abs(now - minutesOf(sunsetIso)) <= 45) return "sunset";
  return isDay ? "day" : "night";
}

/** Rain fell in the previous two hours (the window in which a rainbow is plausible). */
function rainedRecently(forecast: Forecast): boolean {
  const idx = nowHourIndex(forecast);
  const recent = forecast.hourly.precipitation.slice(Math.max(0, idx - 2), idx);
  return recent.reduce((sum, mm) => sum + (mm ?? 0), 0) >= 0.3;
}

// ---------------------------------------------------------------------------
// Scene builders
// ---------------------------------------------------------------------------

type SceneBase = Omit<CastScene, "mood" | "seed" | "activity"> & {
  date: Date;
  activity?: CastScene["activity"];
};

function buildScene(base: SceneBase): CastScene {
  const { date, activity: forced, ...rest } = base;
  // Day number of the place's calendar date; UTC arithmetic keeps it stable across the machine's DST switches.
  const seed = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const candidates = candidateActivities(rest);
  // The daily routine (breakfast, lunch, bedtime) overrides on alternate days
  // rather than joining the pool, so the hour turning over never reshuffles
  // the other scenes.
  const routine = routineActivity(rest);
  const activity = forced ?? (routine && seed % 2 === 0 ? routine : candidates[seed % candidates.length]);
  const def = ACTIVITIES[activity];
  return {
    ...rest,
    seed,
    activity,
    mood: def.mood,
  };
}

/**
 * Scene for the current conditions, on the place's live local clock.
 * `aqi` (US AQI) is optional; unhealthy air overrides the sky with haze.
 */
export function castSceneNow(forecast: Forecast, place: GeoResult, unitSymbol: string, aqi?: number): CastScene {
  const cur = forecast.current;
  const metric = unitSymbol === "C";
  const nowIso = placeLocalIso(forecast);
  const date = isoToDate(nowIso);
  const weather = toCastWeather(cur.weather_code, cur.wind_speed_10m, metric);
  const phase = phaseOf(nowIso, forecast.daily.sunrise[0], forecast.daily.sunset[0], cur.is_day === 1);
  const dry = weather === "clear" || weather === "partly" || weather === "cloudy" || weather === "wind";
  const hazy = dry && aqi !== undefined && aqi >= HAZY_AQI;
  const afterRain =
    !hazy && (weather === "clear" || weather === "partly") && phase !== "night" && rainedRecently(forecast);
  const conditionLabel = hazy ? "Smoky Air" : afterRain ? "After the Rain" : labelFor(cur.weather_code);
  return buildScene({
    weather,
    phase,
    season: seasonOf(date, forecast.latitude),
    feel: feelOf(cur.apparent_temperature, metric),
    windy: cur.wind_speed_10m >= (metric ? 30 : 19),
    icy: FREEZING_CODES.has(cur.weather_code),
    afterRain,
    hazy,
    moonPhase: moonInfo(new Date(), forecast.latitude, forecast.longitude).phase,
    place: formatPlace(place),
    dateLine: friendlyDate(nowIso, true),
    temperature: cur.temperature_2m,
    unitSymbol,
    conditionLabel,
    date,
    hour: hourOf(nowIso),
  });
}

// ---------------------------------------------------------------------------
// The full catalog — one representative scene per activity
// ---------------------------------------------------------------------------

export function demoScenes(): { title: string; scene: CastScene }[] {
  const make = (
    activity: CastScene["activity"],
    weather: CastScene["weather"],
    phase: CastScene["phase"],
    season: CastScene["season"],
    feel: CastScene["feel"],
    temperature: number,
    conditionLabel: string,
    windy = weather === "wind",
    titleNote?: string,
    extra: Partial<Pick<CastScene, "hazy" | "afterRain" | "moonPhase">> = {},
  ) => ({
    title: titleNote ? `${ACTIVITIES[activity].title} — ${titleNote}` : ACTIVITIES[activity].title,
    scene: buildScene({
      activity,
      weather,
      phase,
      season,
      feel,
      windy,
      place: ACTIVITIES[activity].title,
      dateLine: "Cast's world",
      temperature,
      unitSymbol: "C",
      conditionLabel,
      date: new Date(2026, 5, 15),
      ...extra,
    }),
  });
  return [
    make("wakeUp", "clear", "sunrise", "summer", "mild", 15, "Clear Sky"),
    make("wakeUp", "rain", "sunrise", "autumn", "mild", 11, "Light Rain", false, "Rain"),
    make("breakfast", "partly", "sunrise", "spring", "mild", 12, "Partly Cloudy"),
    make("breakfast", "snow", "day", "winter", "cold", -2, "Light Snow", false, "Snow"),
    make("lunch", "clear", "day", "summer", "mild", 22, "Clear Sky"),
    make("lunch", "cloudy", "day", "autumn", "mild", 13, "Overcast", false, "Overcast"),
    make("picnic", "clear", "day", "summer", "mild", 23, "Clear Sky"),
    make("picnic", "partly", "day", "spring", "mild", 17, "Partly Cloudy", false, "Spring"),
    make("applePicking", "clear", "day", "autumn", "mild", 16, "Clear Sky"),
    make("gardening", "clear", "day", "spring", "mild", 18, "Sunny"),
    make("hideSeek", "partly", "day", "summer", "mild", 21, "Partly Cloudy"),
    make("hideSeek", "clear", "day", "autumn", "mild", 14, "Clear Sky", false, "Autumn"),
    make("cloudWatch", "partly", "day", "spring", "mild", 17, "Partly Cloudy"),
    make("painting", "partly", "day", "spring", "mild", 15, "Partly Cloudy"),
    make("painting", "cloudy", "day", "autumn", "mild", 11, "Overcast", false, "Grey Canvas"),
    make("kite", "wind", "day", "autumn", "mild", 14, "Windy"),
    make("kite", "wind", "day", "spring", "mild", 16, "Windy", true, "Spring"),
    make("hike", "clear", "day", "summer", "mild", 19, "Clear Sky"),
    make("hike", "clear", "day", "winter", "cold", -1, "Clear & Frosty", false, "Winter"),
    make("lemonade", "clear", "day", "summer", "hot", 34, "Sunny & Hot"),
    make("raking", "cloudy", "day", "autumn", "mild", 13, "Overcast"),
    make("leafBoat", "drizzle", "day", "autumn", "mild", 12, "Light Drizzle"),
    make("umbrella", "rain", "day", "spring", "mild", 13, "Light Rain"),
    make("umbrella", "drizzle", "day", "autumn", "cold", 6, "Cold Drizzle", false, "Autumn"),
    make("puddleJump", "rain", "day", "spring", "mild", 14, "Light Rain"),
    make("puddleJump", "drizzle", "day", "summer", "mild", 19, "Drizzle", false, "Summer"),
    make("rainbow", "partly", "day", "spring", "mild", 16, "After the Rain", false, "After the Rain", {
      afterRain: true,
    }),
    make("windowWatch", "heavyRain", "day", "autumn", "mild", 11, "Heavy Rain"),
    make("windowWatch", "heavyRain", "night", "autumn", "mild", 10, "Heavy Rain", false, "Night"),
    make("windowWatch", "clear", "day", "summer", "hot", 31, "Smoky Air", false, "Smoky Air", { hazy: true }),
    make("porchCocoa", "storm", "day", "summer", "mild", 19, "Thunderstorm"),
    make("porchCocoa", "storm", "night", "autumn", "mild", 14, "Thunderstorm", false, "Night Storm"),
    make("snowman", "snow", "day", "winter", "cold", -2, "Snow"),
    make("snowman", "snow", "night", "winter", "cold", -6, "Snow", false, "Night"),
    make("flakeCatch", "snow", "day", "winter", "cold", -4, "Light Snow"),
    make("skating", "clear", "day", "winter", "cold", -3, "Clear & Frosty"),
    make("skating", "clear", "night", "winter", "cold", -8, "Clear & Frosty", false, "Moonlight"),
    make("lantern", "fog", "day", "autumn", "mild", 9, "Fog"),
    make("porchCoffee", "clear", "sunrise", "summer", "mild", 16, "Clear Sky"),
    make("goldenHour", "clear", "sunset", "autumn", "mild", 18, "Clear at Sunset"),
    make("stargaze", "clear", "night", "summer", "mild", 15, "Clear Sky"),
    make("stargaze", "partly", "night", "autumn", "mild", 9, "Passing Clouds", false, "Passing Clouds"),
    make("stargaze", "clear", "night", "winter", "cold", -4, "Clear Sky", false, "Full Moon", { moonPhase: 0.5 }),
    make("campfire", "clear", "night", "autumn", "cold", 6, "Clear Sky"),
    make("campfire", "cloudy", "night", "summer", "mild", 16, "Overcast", false, "Overcast"),
    make("bedtime", "clear", "night", "autumn", "mild", 11, "Clear Sky"),
    make("bedtime", "snow", "night", "winter", "cold", -3, "Light Snow", false, "Snow"),
    make("sleep", "clear", "night", "summer", "mild", 14, "Clear Sky"),
    make("sleep", "clear", "night", "winter", "cold", -5, "Clear & Frosty", false, "Winter"),
    make("nap", "cloudy", "day", "autumn", "mild", 12, "Overcast"),
    make("sit", "clear", "day", "spring", "mild", 17, "Clear Sky"),
    make("sit", "wind", "day", "autumn", "cold", 7, "Windy", true, "Windy"),
  ];
}

/**
 * Hidden scene: Cast escanciando sidra, revealed by searching for Asturias
 * or Oviedo in the location search.
 */
export function asturiasScene(): { title: string; scene: CastScene } {
  return {
    title: "Escanciando",
    scene: buildScene({
      activity: "cider",
      weather: "drizzle",
      phase: "day",
      season: "spring",
      feel: "mild",
      windy: false,
      place: "Asturias",
      dateLine: "Paraíso natural — Cast's other home",
      temperature: 16,
      unitSymbol: "C",
      conditionLabel: "Orbayu",
      date: new Date(2026, 5, 15),
    }),
  };
}

/** Hidden scene: Cast runs his favorite command. Revealed by "raycast". */
export function raycastScene(): { title: string; scene: CastScene } {
  return {
    title: "Confetti!",
    scene: buildScene({
      activity: "raycast",
      weather: "clear",
      phase: "night",
      season: "summer",
      feel: "mild",
      windy: false,
      place: "Raycast",
      dateLine: "Cast's favorite command",
      temperature: 18,
      unitSymbol: "C",
      conditionLabel: "Confetti!",
      date: new Date(2026, 5, 15),
    }),
  };
}

/** Hidden scene revealed by the "rainbow" easter egg in the location search. */
export function rainbowScene(): { title: string; scene: CastScene } {
  return {
    title: "Rainbow's End",
    scene: buildScene({
      activity: "rainbow",
      weather: "partly",
      phase: "day",
      season: "spring",
      feel: "mild",
      windy: false,
      place: "Rainbow's End",
      dateLine: "A secret corner of Cast's world",
      temperature: 16,
      unitSymbol: "C",
      conditionLabel: "After the Rain",
      date: new Date(2026, 5, 15),
    }),
  };
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export function renderCastScene(scene: CastScene, displayWidth = CAST_PANEL_WIDTH, idPrefix = "cast-"): string {
  const ip = idPrefix;
  const sky = skyFor(scene);
  const [ground, hill] = groundFor(scene);
  const stage: Stage = ACTIVITIES[scene.activity].compose(scene, ip);
  const dh = Math.round((displayWidth * H) / W);

  const foxX = stage.foxX ?? 585;
  const foxY = stage.foxY ?? 464;
  const foxScale = stage.foxScale ?? 0.95;
  const breathing = aScale(
    [
      [1, 1],
      [1, 1.016],
      [1, 1],
    ],
    { dur: 3.4 },
  );
  let foxLayer = "";
  if (stage.fox) {
    // Static placement outside; each SMIL transform in its own nested group.
    let inner = animated(stage.fox, breathing);
    for (const anim of stage.foxAnims ?? []) inner = animated(inner, anim);
    foxLayer = `<g transform="translate(${foxX} ${foxY}) scale(${foxScale})">${inner}</g>`;
  }
  const shadow =
    stage.noShadow || !stage.fox
      ? ""
      : `<ellipse cx="${foxX}" cy="${foxY + 2}" rx="${stage.shadowRx ?? 118}" ry="14" fill="${CAST.charcoal}" opacity="${scene.phase === "night" ? 0.22 : 0.13}"/>`;

  // Soft shadow keeps the white text readable when a cloud or snowfall passes behind it.
  const text = `<g filter="url(#${ip}text-shadow)">
    <text x="44" y="58" font-family="${FONT}" font-size="26" font-weight="700" fill="${sky.text}">${escapeXml(scene.place)}</text>
    <text x="44" y="86" font-family="${FONT}" font-size="17" fill="${sky.text}" opacity="0.72">${escapeXml(scene.dateLine)}</text>
    <text x="40" y="178" font-family="${FONT}" font-size="86" font-weight="800" fill="${sky.text}" letter-spacing="-2">${Number.isFinite(scene.temperature) ? Math.round(scene.temperature) : "—"}°<tspan font-size="42" font-weight="600" opacity="0.75">${scene.unitSymbol}</tspan></text>
    <text x="44" y="214" font-family="${FONT}" font-size="24" font-weight="600" fill="${sky.accent}">${escapeXml(scene.conditionLabel)}</text>
  </g>`;

  return `<svg width="${displayWidth}" height="${dh}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="${ip}text-shadow" x="-5%" y="-15%" width="115%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="${ip}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky.sky[0]}"/>
      <stop offset="55%" stop-color="${sky.sky[1]}"/>
      <stop offset="100%" stop-color="${sky.sky[2]}"/>
    </linearGradient>
    <radialGradient id="${ip}glow">
      <stop offset="0%" stop-color="${CAST.yellow}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${CAST.yellow}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${ip}frame"><rect x="0" y="0" width="${W}" height="${H}" rx="26"/></clipPath>
  </defs>
  <g clip-path="url(#${ip}frame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${ip}sky)"/>
    ${sky.stars ? stars("#FFFFFF") : ""}
    ${celestial(scene, ip)}
    ${skyClouds(scene)}
    ${stage.farBehind ?? ""}
    <ellipse cx="150" cy="${GROUND_Y + 4}" rx="260" ry="60" fill="${hill}"/>
    <ellipse cx="710" cy="${GROUND_Y + 8}" rx="300" ry="82" fill="${hill}" opacity="0.85"/>
    <rect x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="${ground}"/>
    ${seasonDecor(scene)}
    ${stage.behind ?? ""}
    ${shadow}
    ${foxLayer}
    ${stage.front ?? ""}
    ${ambientOverlay(scene)}
    ${text}
  </g>
</svg>`;
}

/**
 * Square share card (QuickLook's rasterizer crops non-square SVGs): the scene
 * letterboxed on the sky's top color with a small brand footer.
 */
export function buildCastShareSvg(scene: CastScene): string {
  const sceneSvg = renderCastScene(scene, W, "sh-");
  const sky = skyFor(scene);
  const top = Math.round((W - H) / 2);
  return `<svg width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${W}" height="${W}" fill="${sky.sky[0]}"/>
  <g transform="translate(0 ${top})">${sceneSvg}</g>
  <text x="${W / 2}" y="${W - 64}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="6" fill="${sky.text}" opacity="0.7" text-anchor="middle">CAST</text>
  <text x="${W / 2}" y="${W - 36}" font-family="${FONT}" font-size="15" fill="${sky.text}" opacity="0.5" text-anchor="middle">the weather fox</text>
</svg>`;
}
