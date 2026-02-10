import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { PM10_BREAKPOINTS, PM25_BREAKPOINTS, calculateAqiFromBreakpoints, getAqiCategory, getAqiColor } from "./aqi";
import { fetchEeaModelledInfo } from "./providers/eea";
import { fetchManualLocation } from "./providers/geocoding";
import { fetchIqairAirQuality } from "./providers/iqair";
import { fetchIpLocation } from "./providers/keycdn";
import { fetchOpenMeteoAirQuality } from "./providers/openMeteo";
import {
  AirQualitySnapshot,
  AirQualitySource,
  AqiScale,
  EeaModelledInfo,
  LocationInfo,
  Pollutants,
  ProviderReport,
} from "./types";

type Preferences = {
  locationQuery?: string;
  aqiScale?: string;
  iqairApiKey?: string;
};

type CachedState = {
  aqi: number | null;
  pm10: number | null;
  pm25: number | null;
  pollutants: Pollutants | null;
  eea: EeaModelledInfo | null;
  providerReports: ProviderReport[];
  preferredScaleSetting: AqiScale | null;
  iqairEnabled: boolean | null;
  location: LocationInfo | null;
  updatedAtIso: string | null;
  source: AirQualitySource | null;
  aqiScale: AqiScale | null;
  locationQuery: string | null;
  lastFetchAttemptIso: string | null;
  forceRefreshAtIso: string | null;
};

type RuntimeState = {
  isLoading: boolean;
  warning: string | null;
  error: string | null;
};

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const EUROPE_COUNTRY_CODES = new Set([
  "AD",
  "AL",
  "AT",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "TR",
  "UA",
  "VA",
  "XK",
]);

async function readEnvValue(key: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env"), "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [candidate, ...rest] = trimmed.split("=");
      if (candidate !== key) continue;
      const value = rest.join("=").trim();
      return value.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function resolveIqairApiKey(preferences: Preferences): Promise<string | undefined> {
  const fromPrefs = preferences.iqairApiKey?.trim();
  if (fromPrefs) return fromPrefs;
  const fromEnv = process.env.IQAIR_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const fromFile = (await readEnvValue("IQAIR_API_KEY"))?.trim();
  if (fromFile) return fromFile;
  return undefined;
}

function formatLocation(location: LocationInfo | null) {
  return location?.label ?? "Unknown location";
}

function countryCodeToFlag(countryCode?: string | null) {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatLocationSummary(location: LocationInfo | null) {
  const label = formatLocation(location);
  const flag = countryCodeToFlag(location?.countryCode);
  return flag ? `${flag} ${label}` : label;
}

function isEuropeLocation(location: LocationInfo | null) {
  if (!location) return false;
  const continent = location.continentCode?.toUpperCase();
  if (continent === "EU") return true;
  const country = location.countryCode?.toUpperCase();
  return country ? EUROPE_COUNTRY_CODES.has(country) : false;
}

function formatRelativeTime(dateIso: string | null) {
  if (!dateIso) return "Updated unknown";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "Updated unknown";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

function formatPollutantValue(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1);
}

function getUvLabel(value: number | null) {
  if (value === null) return "Unknown";
  if (value < 3) return "Low";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  if (value < 11) return "Very High";
  return "Extreme";
}

function getUvAdviceText(value: number | null) {
  if (value === null) return "UV guidance unavailable.";
  if (value < 3) return "Low risk.";
  if (value < 6) return "Sunscreen and sunglasses.";
  if (value < 8) return "SPF 30+ and shade.";
  if (value < 11) return "Avoid midday sun. SPF 50+.";
  return "Avoid sun exposure.";
}

function getUvSymbol(value: number | null) {
  if (value === null) return "❔";
  if (value < 6) return "✅";
  if (value < 11) return "⚠️";
  return "⛔️";
}

function getAqiAdvice(aqi: number | null, scale: AqiScale) {
  if (aqi === null) return null;
  const category = getAqiCategory(aqi, scale);
  if (scale === "european") {
    const message =
      category.label === "Good"
        ? "Safe to be outside."
        : category.label === "Fair"
          ? "Generally fine outdoors."
          : category.label === "Moderate"
            ? "Take it easy outdoors."
            : category.label === "Poor"
              ? "Limit long outdoor time."
              : category.label === "Very Poor"
                ? "Stay indoors if possible."
                : "Avoid going outside.";
    return { emoji: category.emoji, label: category.label, message };
  }

  const message =
    category.label === "Excellent"
      ? "Safe to be outside."
      : category.label === "Fair"
        ? "Generally fine outdoors."
        : category.label === "Poor"
          ? "Limit long outdoor time."
          : category.label === "Unhealthy"
            ? "Limit outdoor activity."
            : category.label === "Very Unhealthy"
              ? "Stay indoors if possible."
              : "Avoid going outside.";
  return { emoji: category.emoji, label: category.label, message };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const preferencesKey = `${preferences.locationQuery ?? ""}::${preferences.aqiScale ?? ""}::${preferences.iqairApiKey ?? ""}`;
  const [cached, setCached] = useCachedState<CachedState>("aqi-data", {
    aqi: null,
    pm10: null,
    pm25: null,
    pollutants: null,
    eea: null,
    providerReports: [],
    preferredScaleSetting: null,
    iqairEnabled: null,
    location: null,
    updatedAtIso: null,
    source: null,
    aqiScale: null,
    locationQuery: null,
    lastFetchAttemptIso: null,
    forceRefreshAtIso: null,
  });
  const [runtime, setRuntime] = useState<RuntimeState>({
    isLoading: true,
    warning: null,
    error: null,
  });

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const locationQuery = preferences.locationQuery?.trim() ?? "";
        const iqairKey = await resolveIqairApiKey(preferences);
        const preferredScale: AqiScale = preferences.aqiScale === "us" ? "us" : "european";
        const iqairEnabled = Boolean(iqairKey);
        const settingsChanged =
          locationQuery !== cached.locationQuery ||
          preferredScale !== cached.preferredScaleSetting ||
          iqairEnabled !== cached.iqairEnabled;
        const forceRefresh = cached.forceRefreshAtIso !== null || settingsChanged;
        const lastAttempt = cached.lastFetchAttemptIso ? new Date(cached.lastFetchAttemptIso).getTime() : null;
        const now = new Date();
        const isThrottled =
          lastAttempt !== null && Number.isFinite(lastAttempt) && now.getTime() - lastAttempt < REFRESH_INTERVAL_MS;

        // Check if data is stale (last successful update > 1 hour ago)
        const lastUpdate = cached.updatedAtIso ? new Date(cached.updatedAtIso).getTime() : null;
        const isDataStale =
          lastUpdate !== null && Number.isFinite(lastUpdate) && now.getTime() - lastUpdate >= REFRESH_INTERVAL_MS;

        if (!forceRefresh && isThrottled && cached.aqi !== null && !isDataStale) {
          setRuntime({ isLoading: false, warning: null, error: null });
          return;
        }
        if (!forceRefresh && isThrottled && cached.aqi === null) {
          setRuntime({
            isLoading: false,
            warning: null,
            error: "Rate limited. Try again in about an hour.",
          });
          return;
        }

        setRuntime((prev) => ({ ...prev, isLoading: true, warning: null, error: null }));
        const attemptIso = now.toISOString();
        setCached((prev) => ({
          ...prev,
          lastFetchAttemptIso: attemptIso,
          locationQuery,
          preferredScaleSetting: preferredScale,
          iqairEnabled,
        }));

        const location = locationQuery ? await fetchManualLocation(locationQuery) : await fetchIpLocation();
        const isEurope = isEuropeLocation(location);

        const providerPromises: Array<{ source: AirQualitySource; promise: Promise<AirQualitySnapshot> }> = [
          {
            source: "open-meteo",
            promise: fetchOpenMeteoAirQuality(location.latitude, location.longitude, preferredScale),
          },
        ];
        if (iqairKey) {
          providerPromises.push({
            source: "iqair",
            promise: fetchIqairAirQuality(location.latitude, location.longitude, iqairKey),
          });
        }

        const eeaResultPromise: Promise<PromiseSettledResult<EeaModelledInfo> | null> = isEurope
          ? fetchEeaModelledInfo(location.latitude, location.longitude)
              .then((value) => ({ status: "fulfilled", value }) as const)
              .catch((reason) => ({ status: "rejected", reason }) as const)
          : Promise.resolve(null);

        const [settled, eeaResult] = await Promise.all([
          Promise.allSettled(providerPromises.map((item) => item.promise)),
          eeaResultPromise,
        ]);
        const snapshots = new Map<AirQualitySource, AirQualitySnapshot>();
        const failures: string[] = [];
        settled.forEach((result, index) => {
          const source = providerPromises[index].source;
          if (result.status === "fulfilled") {
            snapshots.set(source, result.value);
          } else if (source === "iqair" || source === "open-meteo") {
            failures.push(source === "iqair" ? "IQAir" : "Open-Meteo");
          }
        });

        const iqairSnapshot = snapshots.get("iqair");
        const openMeteoSnapshot = snapshots.get("open-meteo");
        const primarySnapshot =
          preferredScale === "european" ? (openMeteoSnapshot ?? iqairSnapshot) : (iqairSnapshot ?? openMeteoSnapshot);
        if (!primarySnapshot) {
          throw new Error("Air quality data unavailable.");
        }

        const warnings: string[] = [];
        if (failures.length) {
          warnings.push(`${failures.join(" & ")} unavailable`);
        }
        if (eeaResult && eeaResult.status === "rejected") {
          warnings.push("EEA modelled data unavailable");
        }
        if (primarySnapshot.aqiScale !== preferredScale) {
          const preferredLabel = preferredScale === "european" ? "European AQI" : "US AQI";
          const actualLabel = primarySnapshot.aqiScale === "european" ? "European AQI" : "US AQI";
          warnings.push(`${preferredLabel} unavailable (using ${actualLabel})`);
        }

        const eeaInfo =
          eeaResult && eeaResult.status === "fulfilled" ? eeaResult.value : isEurope ? (cached.eea ?? null) : null;

        const mergedSnapshot: AirQualitySnapshot = {
          ...primarySnapshot,
          pm10: primarySnapshot.pm10 ?? openMeteoSnapshot?.pm10 ?? null,
          pm25: primarySnapshot.pm25 ?? openMeteoSnapshot?.pm25 ?? null,
          pollutants: primarySnapshot.pollutants ?? openMeteoSnapshot?.pollutants ?? null,
        };

        const providerReports: ProviderReport[] = [
          {
            id: "open-meteo",
            label: "OM",
            updatedAtIso: openMeteoSnapshot?.timeIso ?? null,
            aqiUs: openMeteoSnapshot?.aqiUs ?? null,
            aqiEu: openMeteoSnapshot?.aqiEu ?? null,
            pm25: openMeteoSnapshot?.pm25 ?? null,
            pm10: openMeteoSnapshot?.pm10 ?? null,
            ozone: openMeteoSnapshot?.pollutants?.ozone ?? null,
            no2: openMeteoSnapshot?.pollutants?.nitrogenDioxide ?? null,
            so2: openMeteoSnapshot?.pollutants?.sulphurDioxide ?? null,
            co: openMeteoSnapshot?.pollutants?.carbonMonoxide ?? null,
            dust: openMeteoSnapshot?.pollutants?.dust ?? null,
          },
        ];
        if (iqairEnabled) {
          providerReports.push({
            id: "iqair",
            label: "IQ",
            updatedAtIso: iqairSnapshot?.timeIso ?? null,
            aqiUs: iqairSnapshot?.aqiUs ?? null,
            aqiEu: iqairSnapshot?.aqiEu ?? null,
            pm25: iqairSnapshot?.pm25 ?? null,
            pm10: iqairSnapshot?.pm10 ?? null,
          });
        }
        if (isEurope) {
          providerReports.push({
            id: "eea",
            label: "EEA",
            updatedAtIso: eeaInfo?.timeIso ?? null,
            eeaIndex: eeaInfo?.aqi ?? null,
            pm25: eeaInfo?.valPm25 ?? null,
            pm10: eeaInfo?.valPm10 ?? null,
            ozone: eeaInfo?.valO3 ?? null,
            no2: eeaInfo?.valNo2 ?? null,
          });
        }

        const warning = warnings.length ? warnings.join(" · ") : null;
        const updatedAt = new Date(attemptIso);
        if (!isActive) return;

        setCached({
          aqi: mergedSnapshot.aqi,
          pm10: mergedSnapshot.pm10,
          pm25: mergedSnapshot.pm25,
          pollutants: mergedSnapshot.pollutants ?? null,
          eea: eeaInfo,
          providerReports,
          preferredScaleSetting: preferredScale,
          iqairEnabled,
          location,
          updatedAtIso: updatedAt.toISOString(),
          source: mergedSnapshot.source,
          aqiScale: mergedSnapshot.aqiScale,
          locationQuery,
          lastFetchAttemptIso: attemptIso,
          forceRefreshAtIso: null,
        });
        setRuntime({ isLoading: false, warning, error: null });
      } catch (error) {
        if (!isActive) return;
        setCached((prev) => ({ ...prev, forceRefreshAtIso: null }));
        setRuntime((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load AQI.",
        }));
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [cached.aqi, cached.forceRefreshAtIso, preferencesKey]);

  const aqiScale = cached.aqiScale ?? "us";
  const aqiScaleTitle = cached.aqiScale === "european" ? "EU AQI" : cached.aqiScale === "us" ? "US AQI" : "AQI";
  const aqiColor = cached.aqi !== null ? getAqiColor(cached.aqi, aqiScale) : null;
  const menuBarTitle = cached.aqi !== null ? `${aqiScaleTitle} ${cached.aqi}` : "AQI --";
  const tooltip = runtime.error ? `AQI Error: ${runtime.error}` : menuBarTitle;
  const menuBarIcon = runtime.error
    ? Icon.Warning
    : aqiColor
      ? { source: Icon.CircleFilled, tintColor: aqiColor.tint }
      : Icon.Cloud;
  const sourceLabel = cached.source === "iqair" ? "IQAir" : cached.source === "open-meteo" ? "Open-Meteo" : "Unknown";
  const aqiScaleLabel = cached.aqiScale === "european" ? "EU" : cached.aqiScale === "us" ? "US" : "Unknown";
  const locationSourceLabel =
    cached.location?.source === "manual" ? "Manual" : cached.location ? "IP-based" : "Unknown";
  const isEurope = isEuropeLocation(cached.location);
  const locationCountryCode = cached.location?.countryCode?.toUpperCase() ?? "—";
  const locationContinentCode = cached.location?.continentCode?.toUpperCase() ?? "—";
  const pm25Aqi = cached.pm25 !== null ? calculateAqiFromBreakpoints(cached.pm25, PM25_BREAKPOINTS) : null;
  const pm10Aqi = cached.pm10 !== null ? calculateAqiFromBreakpoints(cached.pm10, PM10_BREAKPOINTS) : null;
  const pm25Category = pm25Aqi !== null ? getAqiCategory(pm25Aqi, "us") : null;
  const pm10Category = pm10Aqi !== null ? getAqiCategory(pm10Aqi, "us") : null;
  const gases = cached.pollutants
    ? [
        { label: "CO", value: cached.pollutants.carbonMonoxide },
        { label: "NO₂", value: cached.pollutants.nitrogenDioxide },
        { label: "SO₂", value: cached.pollutants.sulphurDioxide },
        { label: "O₃", value: cached.pollutants.ozone },
      ].filter((item) => item.value !== null)
    : [];
  const dustValue = cached.pollutants?.dust ?? null;
  const uvIndex = cached.pollutants?.uvIndex ?? null;
  const aqiAdvice = getAqiAdvice(cached.aqi, aqiScale);
  const aqiTitle = aqiAdvice ? `${aqiAdvice.emoji} ${menuBarTitle}` : menuBarTitle;
  const uvTip =
    uvIndex !== null
      ? {
          symbol: getUvSymbol(uvIndex),
          label: getUvLabel(uvIndex),
          advice: getUvAdviceText(uvIndex),
        }
      : null;
  const summarySubtitle = `${aqiScaleLabel} · ${formatRelativeTime(cached.updatedAtIso)}`;
  const providerReports = cached.providerReports ?? [];

  const providerNameMap: Record<ProviderReport["id"], string> = {
    "open-meteo": "Open-Meteo",
    iqair: "IQAir",
    eea: "EEA Modelled",
  };

  const primaryProviderId = cached.source ?? null;
  const hasProviderData = (report: ProviderReport) =>
    [
      report.aqiUs,
      report.aqiEu,
      report.eeaIndex,
      report.pm25,
      report.pm10,
      report.ozone,
      report.no2,
      report.so2,
      report.co,
      report.dust,
    ].some((value) => value !== null && value !== undefined);

  const secondaryProviders = providerReports
    .filter((report) => report.id !== primaryProviderId)
    .map((report) => `${providerNameMap[report.id]}${hasProviderData(report) ? "" : " (no data)"}`)
    .join(" · ");

  const formatCompactValue = (label: string, value: number | null | undefined, formatter: (value: number) => string) =>
    value === null || value === undefined ? null : `${label} ${formatter(value)}`;

  const compactRows = providerReports.map((report) => {
    const parts = [
      providerNameMap[report.id],
      formatCompactValue("EU", report.aqiEu, (value) => Math.round(value).toString()),
      formatCompactValue("US", report.aqiUs, (value) => Math.round(value).toString()),
      formatCompactValue("EEA", report.eeaIndex, (value) => value.toFixed(1)),
      formatCompactValue("PM2.5", report.pm25, (value) => value.toFixed(1)),
      formatCompactValue("PM10", report.pm10, (value) => value.toFixed(1)),
      formatCompactValue("O3", report.ozone, (value) => value.toFixed(1)),
      formatCompactValue("NO2", report.no2, (value) => value.toFixed(1)),
      formatCompactValue("SO2", report.so2, (value) => value.toFixed(1)),
      formatCompactValue("CO", report.co, (value) => value.toFixed(1)),
      formatCompactValue("Dust", report.dust, (value) => value.toFixed(1)),
    ].filter(Boolean) as string[];

    return parts.join(" · ");
  });

  return (
    <MenuBarExtra icon={menuBarIcon} title={menuBarTitle} tooltip={tooltip} isLoading={runtime.isLoading}>
      {runtime.error && <MenuBarExtra.Item title="Refresh failed" subtitle={runtime.error} icon={Icon.Warning} />}
      {runtime.warning && (
        <MenuBarExtra.Item title="Provider unavailable" subtitle={runtime.warning} icon={Icon.Info} />
      )}
      <MenuBarExtra.Section title="At a Glance">
        <MenuBarExtra.Item title={aqiTitle} subtitle={summarySubtitle} />
      </MenuBarExtra.Section>
      {(aqiAdvice || uvTip) && (
        <MenuBarExtra.Section title="Guidance">
          {aqiAdvice && (
            <MenuBarExtra.Item title={`${aqiAdvice.emoji} ${aqiAdvice.label}`} subtitle={aqiAdvice.message} />
          )}
          {uvTip && <MenuBarExtra.Item title={`${uvTip.symbol} UV ${uvTip.label}`} subtitle={uvTip.advice} />}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Particulates">
        {cached.pm25 !== null && pm25Aqi !== null && (
          <MenuBarExtra.Item
            title={`PM2.5 ${cached.pm25.toFixed(1)} ug/m3`}
            subtitle={pm25Category ? pm25Category.label : "—"}
          />
        )}
        {cached.pm10 !== null && pm10Aqi !== null && (
          <MenuBarExtra.Item
            title={`PM10 ${cached.pm10.toFixed(1)} ug/m3`}
            subtitle={pm10Category ? pm10Category.label : "—"}
          />
        )}
        {cached.pm25 === null && cached.pm10 === null && (
          <MenuBarExtra.Item title="PM details unavailable" subtitle="No PM data returned." />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Submenu title="Details">
        <MenuBarExtra.Section title="Location">
          <MenuBarExtra.Item title={formatLocationSummary(cached.location)} />
          <MenuBarExtra.Item
            title="Coordinates"
            subtitle={
              cached.location
                ? `${cached.location.latitude.toFixed(4)}, ${cached.location.longitude.toFixed(4)}`
                : "Unknown"
            }
          />
          <MenuBarExtra.Item title="Location source" subtitle={locationSourceLabel} />
          <MenuBarExtra.Item
            title={`Europe detection · ${isEurope ? "Yes" : "No"}`}
            subtitle={`Country ${locationCountryCode} · Continent ${locationContinentCode}`}
          />
        </MenuBarExtra.Section>

        <MenuBarExtra.Section title="Sources">
          <MenuBarExtra.Item
            title={`Primary: ${sourceLabel} (${aqiScaleLabel} AQI)`}
            subtitle={formatRelativeTime(cached.updatedAtIso)}
          />
          <MenuBarExtra.Item title="Secondary" subtitle={secondaryProviders || "None"} />
          {!isEurope && <MenuBarExtra.Item title="EEA Modelled" subtitle="Not in Europe (disabled)" />}
          {isEurope && !cached.eea && <MenuBarExtra.Item title="EEA Modelled" subtitle="Not available" />}
        </MenuBarExtra.Section>

        {(gases.length > 0 || dustValue !== null) && (
          <MenuBarExtra.Section title="Pollutants">
            {gases.length > 0 && (
              <MenuBarExtra.Item
                title="Gases (ug/m3)"
                subtitle={gases.map((gas) => `${gas.label} ${formatPollutantValue(gas.value)}`).join(" · ")}
              />
            )}
            {dustValue !== null && (
              <MenuBarExtra.Item title="Dust (ug/m3)" subtitle={formatPollutantValue(dustValue)} />
            )}
          </MenuBarExtra.Section>
        )}

        {compactRows.length > 0 && (
          <MenuBarExtra.Section title="Providers">
            {compactRows.map((row, index) => (
              <MenuBarExtra.Item key={`provider-row-${index}`} title={row} />
            ))}
            <MenuBarExtra.Item title="Units: AQI index, others ug/m3" />
          </MenuBarExtra.Section>
        )}

        <MenuBarExtra.Section title="Actions">
          <MenuBarExtra.Item
            title="Reset Cached Data"
            icon={Icon.Trash}
            onAction={() => {
              setCached({
                aqi: null,
                pm10: null,
                pm25: null,
                pollutants: null,
                eea: null,
                providerReports: [],
                preferredScaleSetting: null,
                iqairEnabled: null,
                location: null,
                updatedAtIso: null,
                source: null,
                aqiScale: null,
                locationQuery: null,
                lastFetchAttemptIso: null,
                forceRefreshAtIso: new Date().toISOString(),
              });
              setRuntime({ isLoading: true, warning: null, error: null });
            }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
