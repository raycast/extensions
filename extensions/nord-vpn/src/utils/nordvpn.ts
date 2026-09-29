import { execFile } from "node:child_process";

export type PublicLocation = {
  ip: string;
  country: string;
  countryCode: string;
};

export type NordVpnCountry = {
  id?: number;
  name: string;
  code: string;
  cities: NordVpnCity[];
};

export type NordVpnCity = {
  id?: number;
  name: string;
  serverCount?: number;
};

const GEOLOCATION_URL = "https://ipwho.is/";
const COUNTRIES_URL = "https://api.nordvpn.com/v1/servers/countries";
const FALLBACK_COUNTRIES: NordVpnCountry[] = [
  ["Albania", "AL"],
  ["Argentina", "AR"],
  ["Australia", "AU"],
  ["Austria", "AT"],
  ["Belgium", "BE"],
  ["Brazil", "BR"],
  ["Bulgaria", "BG"],
  ["Canada", "CA"],
  ["Chile", "CL"],
  ["Colombia", "CO"],
  ["Croatia", "HR"],
  ["Cyprus", "CY"],
  ["Czech Republic", "CZ"],
  ["Denmark", "DK"],
  ["Estonia", "EE"],
  ["Finland", "FI"],
  ["France", "FR"],
  ["Germany", "DE"],
  ["Greece", "GR"],
  ["Hong Kong", "HK"],
  ["Hungary", "HU"],
  ["Iceland", "IS"],
  ["India", "IN"],
  ["Indonesia", "ID"],
  ["Ireland", "IE"],
  ["Israel", "IL"],
  ["Italy", "IT"],
  ["Japan", "JP"],
  ["Latvia", "LV"],
  ["Lithuania", "LT"],
  ["Luxembourg", "LU"],
  ["Malaysia", "MY"],
  ["Mexico", "MX"],
  ["Moldova", "MD"],
  ["Netherlands", "NL"],
  ["New Zealand", "NZ"],
  ["Nigeria", "NG"],
  ["North Macedonia", "MK"],
  ["Norway", "NO"],
  ["Poland", "PL"],
  ["Portugal", "PT"],
  ["Romania", "RO"],
  ["Serbia", "RS"],
  ["Singapore", "SG"],
  ["Slovakia", "SK"],
  ["Slovenia", "SI"],
  ["South Africa", "ZA"],
  ["South Korea", "KR"],
  ["Spain", "ES"],
  ["Sweden", "SE"],
  ["Switzerland", "CH"],
  ["Taiwan", "TW"],
  ["Thailand", "TH"],
  ["Turkey", "TR"],
  ["Ukraine", "UA"],
  ["United Arab Emirates", "AE"],
  ["United Kingdom", "GB"],
  ["United States", "US"],
  ["Vietnam", "VN"],
].map(([name, code]) => ({
  id: code === "IT" ? 106 : undefined,
  name,
  code,
  cities:
    code === "IT"
      ? [
          { id: 4542737, name: "Milan", serverCount: 114 },
          { id: 4548074, name: "Palermo", serverCount: 12 },
          { id: 4555808, name: "Rome", serverCount: 52 },
        ]
      : [],
}));
const SERVERS_URL = "https://api.nordvpn.com/v1/servers";
const POWERSHELL_STATUS_SCRIPT = [
  "$adapter = Get-NetAdapter -Name 'NordLynx' -ErrorAction SilentlyContinue",
  "if ($null -eq $adapter) { [Console]::Error.WriteLine('NordLynx adapter was not found.'); exit 2 }",
  "[Console]::Out.Write($adapter.Status)",
].join("; ");

export function getNordLynxStatus(timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", POWERSHELL_STATUS_SCRIPT],
      { windowsHide: true, timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }

        const status = stdout.trim();
        if (!status) {
          reject(new Error("PowerShell returned an empty NordLynx status."));
          return;
        }

        resolve(status);
      },
    );
  });
}

export function runNordVPNCommand(executablePath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      executablePath,
      args,
      { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }

        resolve();
      },
    );
  });
}

export async function getPublicLocation(timeoutMs = 5000): Promise<PublicLocation> {
  const response = await fetch(GEOLOCATION_URL, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Geolocation service returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("success" in payload) ||
    payload.success !== true ||
    !("ip" in payload) ||
    typeof payload.ip !== "string" ||
    !("country" in payload) ||
    typeof payload.country !== "string" ||
    !("country_code" in payload) ||
    typeof payload.country_code !== "string"
  ) {
    throw new Error("Geolocation service returned an unexpected response.");
  }

  return { ip: payload.ip, country: payload.country, countryCode: payload.country_code };
}

export async function getNordVpnCountries(): Promise<{ countries: NordVpnCountry[]; fallbackReason?: string }> {
  try {
    const response = await fetch(COUNTRIES_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      throw new Error(`Country service returned HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Country service returned an unexpected response.");
    }

    const countries = payload
      .filter(
        (
          country,
        ): country is {
          id: number;
          name: string;
          code: string;
          cities: { id: number; name: string; serverCount?: number }[];
        } =>
          typeof country === "object" &&
          country !== null &&
          "id" in country &&
          typeof country.id === "number" &&
          "name" in country &&
          typeof country.name === "string" &&
          "code" in country &&
          typeof country.code === "string" &&
          "cities" in country &&
          Array.isArray(country.cities),
      )
      .map(({ id, name, code, cities }) => ({
        id,
        name,
        code,
        cities: cities
          .filter(
            (city): city is { id: number; name: string; serverCount?: number } =>
              typeof city === "object" &&
              city !== null &&
              "id" in city &&
              typeof city.id === "number" &&
              "name" in city &&
              typeof city.name === "string",
          )
          .map(({ id: cityId, name: cityName, ...city }) => ({
            id: cityId,
            name: cityName,
            serverCount: "serverCount" in city && typeof city.serverCount === "number" ? city.serverCount : undefined,
          })),
      }));
    if (countries.length === 0) {
      throw new Error("Country service returned no usable countries.");
    }

    const fallbackCountries = new Map(FALLBACK_COUNTRIES.map((country) => [country.code, country]));
    return {
      countries: countries.map((country) => ({
        ...country,
        cities: country.cities.length > 0 ? country.cities : (fallbackCountries.get(country.code)?.cities ?? []),
      })),
    };
  } catch (error) {
    return {
      countries: FALLBACK_COUNTRIES,
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getNordVpnServerForCity(country: NordVpnCountry, city: NordVpnCity): Promise<string> {
  if (!country.id || !city.id) {
    throw new Error(`NordVPN does not provide server IDs for ${city.name}, ${country.name}.`);
  }

  const url = new URL(SERVERS_URL);
  url.searchParams.set("filters[country_id]", String(country.id));
  url.searchParams.set("limit", "5000");

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`NordVPN server service returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("NordVPN server service returned an unexpected response.");
  }

  const servers = payload.filter(
    (
      server,
    ): server is {
      name: string;
      status: string;
      load: number;
      locations: { country: { city: { id: number } } }[];
      technologies: { identifier: string; pivot?: { status: string } }[];
    } =>
      typeof server === "object" &&
      server !== null &&
      "name" in server &&
      typeof server.name === "string" &&
      "status" in server &&
      typeof server.status === "string" &&
      "load" in server &&
      typeof server.load === "number" &&
      "locations" in server &&
      Array.isArray(server.locations) &&
      server.locations.some(
        (location: unknown) =>
          typeof location === "object" &&
          location !== null &&
          "country" in location &&
          typeof location.country === "object" &&
          location.country !== null &&
          "city" in location.country &&
          typeof location.country.city === "object" &&
          location.country.city !== null &&
          "id" in location.country.city &&
          typeof location.country.city.id === "number",
      ) &&
      "technologies" in server &&
      Array.isArray(server.technologies) &&
      server.technologies.some(
        (technology: unknown) =>
          typeof technology === "object" &&
          technology !== null &&
          "identifier" in technology &&
          typeof technology.identifier === "string",
      ),
  );
  const cityServers = servers
    .filter(
      (server) =>
        server.status === "online" &&
        server.locations.some((location) => location.country.city.id === city.id) &&
        server.technologies.some(
          (technology) =>
            technology.identifier === "wireguard_udp" && (!technology.pivot || technology.pivot.status === "online"),
        ),
    )
    .sort((first, second) => first.load - second.load);

  if (cityServers.length === 0) {
    throw new Error(`No NordLynx server is available in ${city.name}, ${country.name}.`);
  }

  return cityServers[0].name;
}

export async function waitForConnection(previousIp: string, timeoutMs = 15000): Promise<PublicLocation> {
  const deadline = Date.now() + timeoutMs;
  let lastObservation = "NordLynx adapter has not connected yet.";

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    const [adapterResult, locationResult] = await Promise.allSettled([
      getNordLynxStatus(Math.min(5000, remainingMs)),
      getPublicLocation(Math.min(4000, remainingMs)),
    ]);

    if (adapterResult.status === "fulfilled" && locationResult.status === "fulfilled") {
      if (adapterResult.value === "Up" && locationResult.value.ip !== previousIp) {
        return locationResult.value;
      }

      lastObservation = `Adapter: ${adapterResult.value}; public IP: ${locationResult.value.ip}.`;
    } else {
      const errors = [adapterResult, locationResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
      lastObservation = errors.join(" ");
    }

    const remainingAfterPollMs = deadline - Date.now();
    if (remainingAfterPollMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, remainingAfterPollMs)));
    }
  }

  throw new Error(`Connection was not confirmed within ${timeoutMs / 1000} seconds. ${lastObservation}`);
}

export async function waitForCountryConnection(
  countryCode: string,
  previousAdapterStatus: string,
  previousLocation: PublicLocation,
  timeoutMs = 15000,
): Promise<PublicLocation> {
  const deadline = Date.now() + timeoutMs;
  let lastObservation = "NordLynx adapter has not connected yet.";

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    const [adapterResult, locationResult] = await Promise.allSettled([
      getNordLynxStatus(Math.min(5000, remainingMs)),
      getPublicLocation(Math.min(4000, remainingMs)),
    ]);

    if (adapterResult.status === "fulfilled" && locationResult.status === "fulfilled") {
      const isAlreadyOnRequestedCountry =
        previousAdapterStatus === "Up" && previousLocation.countryCode.toUpperCase() === countryCode.toUpperCase();
      const ipChanged = locationResult.value.ip !== previousLocation.ip;
      if (
        adapterResult.value === "Up" &&
        locationResult.value.countryCode.toUpperCase() === countryCode.toUpperCase() &&
        (!isAlreadyOnRequestedCountry || ipChanged)
      ) {
        return locationResult.value;
      }

      lastObservation = `Adapter: ${adapterResult.value}; public location: ${locationResult.value.country} (${locationResult.value.countryCode}), IP ${locationResult.value.ip}.`;
    } else {
      const errors = [adapterResult, locationResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
      lastObservation = errors.join(" ");
    }

    const remainingAfterPollMs = deadline - Date.now();
    if (remainingAfterPollMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, remainingAfterPollMs)));
    }
  }

  throw new Error(
    `Connection to the selected country was not confirmed within ${timeoutMs / 1000} seconds. ${lastObservation}`,
  );
}

export async function waitForDisconnect(
  previousAdapterStatus: string,
  previousLocation: PublicLocation,
  timeoutMs = 15000,
): Promise<PublicLocation> {
  if (previousAdapterStatus !== "Up") {
    return previousLocation;
  }

  const deadline = Date.now() + timeoutMs;
  let lastObservation = "NordLynx adapter is still connected.";

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    const [adapterResult, locationResult] = await Promise.allSettled([
      getNordLynxStatus(Math.min(5000, remainingMs)),
      getPublicLocation(Math.min(4000, remainingMs)),
    ]);

    if (adapterResult.status === "fulfilled" && locationResult.status === "fulfilled") {
      if (adapterResult.value === "Disconnected" && locationResult.value.ip !== previousLocation.ip) {
        return locationResult.value;
      }

      lastObservation = `Adapter: ${adapterResult.value}; public location: ${locationResult.value.country}, IP ${locationResult.value.ip}.`;
    } else {
      const errors = [adapterResult, locationResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
      lastObservation = errors.join(" ");
    }

    const remainingAfterPollMs = deadline - Date.now();
    if (remainingAfterPollMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, remainingAfterPollMs)));
    }
  }

  throw new Error(`VPN disconnection was not confirmed within ${timeoutMs / 1000} seconds. ${lastObservation}`);
}
