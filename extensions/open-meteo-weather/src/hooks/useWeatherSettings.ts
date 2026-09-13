import { LaunchType, environment, launchCommand } from "@raycast/api";
import { useEffect } from "react";
import { GeoResult, Units } from "../lib/api";
import { ThemeId, isThemeId } from "../lib/themes";
import { usePersistentState } from "./usePersistentState";

/**
 * The menu bar only re-renders on its refresh interval, so changes it displays
 * (city, units) push a background refresh. Fire-and-forget: launching fails
 * harmlessly when the menu bar command is disabled.
 */
function refreshMenuBar() {
  if (environment.commandName === "menubar") return;
  launchCommand({ name: "menubar", type: LaunchType.Background }).catch(() => {});
}

export type ViewId = "list" | "today" | "radar";

const isGeoResult = (v: unknown): v is GeoResult => {
  const g = v as Partial<GeoResult> | null;
  return (
    typeof g?.id === "number" &&
    typeof g.name === "string" &&
    Number.isFinite(g.latitude) &&
    Number.isFinite(g.longitude)
  );
};
const isGeoResults = (v: unknown): v is GeoResult[] => Array.isArray(v) && v.every(isGeoResult);
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const isUnits = (v: unknown): v is Units => v === "celsius" || v === "fahrenheit";
const isViewId = (v: unknown): v is ViewId => v === "list" || v === "today" || v === "radar";
const isForecastDays = (v: unknown): v is number => v === 7 || v === 16;

/** In-app settings shared by every command, persisted across launches. */
export interface WeatherSettings {
  /** True until saved settings have been read from durable storage; only matters on a cold cache. */
  isLoading: boolean;
  locations: GeoResult[];
  /** Undefined only when no locations are saved (onboarding pending). */
  active: GeoResult | undefined;
  /** True once the full first-run wizard has been completed. */
  onboarded: boolean;
  setActiveId: (id: number) => void;
  /** Cycle to the next saved location (no-op with a single location). */
  nextLocation: () => void;
  addLocation: (g: GeoResult) => void;
  removeActive: () => void;
  completeOnboarding: (location: GeoResult, units: Units, theme: ThemeId) => void;
  units: Units;
  unitSymbol: string;
  windUnit: string;
  toggleUnits: () => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  /** Last used view, restored on next launch. */
  view: ViewId;
  setView: (v: ViewId) => void;
  /** Forecast length in days: 7 or 16. */
  forecastDays: number;
  toggleForecastDays: () => void;
}

export function useWeatherSettings(): WeatherSettings {
  const [locations, setLocations, locationsReady] = usePersistentState<GeoResult[]>("locations", [], isGeoResults);
  const [activeId, setActiveId, activeReady] = usePersistentState<number>("active-location-id", 0, isNumber);
  const [units, setUnits] = usePersistentState<Units>("units", "celsius", isUnits);
  const [theme, setTheme] = usePersistentState<ThemeId>("theme", "atmosphere", isThemeId);
  const [onboarded, setOnboarded, onboardedReady] = usePersistentState<boolean>("onboarded", false, isBoolean);
  const [view, setView] = usePersistentState<ViewId>("view", "list", isViewId);
  const [forecastDays, setForecastDays] = usePersistentState<number>("forecast-days", 7, isForecastDays);

  // Anyone who already has locations went through setup before the flag existed.
  useEffect(() => {
    if (locations.length > 0 && !onboarded) setOnboarded(true);
  }, [locations.length, onboarded]);

  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  return {
    isLoading: !(locationsReady && activeReady && onboardedReady),
    locations,
    active,
    onboarded,
    setActiveId: (id) => {
      setActiveId(id);
      refreshMenuBar();
    },
    nextLocation: () => {
      if (!active || locations.length < 2) return;
      const idx = locations.findIndex((l) => l.id === active.id);
      setActiveId(locations[(idx + 1) % locations.length].id);
      refreshMenuBar();
    },
    addLocation: (geo) => {
      setLocations((prev) => (prev.some((l) => l.id === geo.id) ? prev : [...prev, geo]));
      setActiveId(geo.id);
      refreshMenuBar();
    },
    removeActive: () => {
      if (!active) return;
      // Removing the last location empties the list, which brings back onboarding.
      const rest = locations.filter((l) => l.id !== active.id);
      setLocations(rest);
      if (rest.length > 0) setActiveId(rest[0].id);
      refreshMenuBar();
    },
    completeOnboarding: (location, chosenUnits, chosenTheme) => {
      setLocations([location]);
      setActiveId(location.id);
      setUnits(chosenUnits);
      setTheme(chosenTheme);
      setOnboarded(true);
      refreshMenuBar();
    },
    units,
    unitSymbol: units === "celsius" ? "C" : "F",
    windUnit: units === "celsius" ? "km/h" : "mph",
    toggleUnits: () => {
      setUnits(units === "celsius" ? "fahrenheit" : "celsius");
      refreshMenuBar();
    },
    theme,
    setTheme,
    view,
    setView,
    forecastDays,
    toggleForecastDays: () => setForecastDays(forecastDays === 7 ? 16 : 7),
  };
}
