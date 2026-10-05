// src/tools/mozilla-vpn-control.ts

import {
  fetchServerLocations,
  selectRandomServerFromCity,
  CountryLocation,
  CityLocation,
} from '../utils/serverUtils';
import { runCommand, checkVpnStatus } from '../utils/vpnService';
import { fetchCurrentIP } from '../utils/fetchCurrentIP';
import { open } from '@raycast/api';
import { notifyVpnStatusChange } from '../utils/vpnCache';

// Timing constants for VPN operations
const DISCONNECT_DELAY_MS = 4000;
const CONNECT_DELAY_MS = 2000;
const SERVER_SWITCH_DELAY_MS = 4000;
const RETRY_DELAY_MS = 2000;
const RETRY_CONNECT_DELAY_MS = 3000;
const MAX_CONNECTION_RETRIES = 2;

/**
 * Input parameters for controlling Mozilla VPN.
 */
type VpnControlInput = {
  /**
   * The action to perform with Mozilla VPN:
   * - 'connect': Connect to the VPN, optionally targeting a specific country/city.
   * - 'disconnect': Disconnect the active VPN connection.
   * - 'status': Check current VPN connection status, active location, and external IP.
   * - 'list': List all available VPN countries.
   * - 'list_cities': List all available cities in a country (requires `country`).
   * - 'list_servers': List all available servers in a country or city (requires `country`).
   * - 'change_server': Change the configured VPN server without connecting.
   * - 'open_account': Open the Mozilla/Firefox Account management and subscription portal in your default browser (e.g. 'Open Account', 'Open My Account', 'Manage subscription').
   */
  action?:
    | 'connect'
    | 'disconnect'
    | 'status'
    | 'list'
    | 'list_cities'
    | 'list_servers'
    | 'change_server'
    | 'open_account';
  /**
   * Country name or country code (e.g. 'USA', 'Germany', 'UK', 'ca').
   * Required for list_cities, list_servers, and when connecting/switching to a specific country.
   */
  country?: string;
  /**
   * City name (e.g. 'Seattle', 'Berlin', 'London').
   * Optional filter for connect, change_server, or list_servers.
   */
  city?: string;
  /**
   * Whether to automatically connect to the VPN after changing the server location. Defaults to true for connect requests.
   */
  connect_after_change?: boolean;
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  usa: ['usa', 'us', 'united states', 'united states of america'],
  uk: [
    'uk',
    'gb',
    'gbr',
    'united kingdom',
    'great britain',
    'britain',
    'england',
  ],
  germany: ['germany', 'de', 'deu', 'deutschland'],
  netherlands: ['netherlands', 'nl', 'holland'],
  switzerland: ['switzerland', 'ch', 'swiss'],
  sweden: ['sweden', 'se', 'sverige'],
  spain: ['spain', 'es', 'españa'],
  france: ['france', 'fr'],
  italy: ['italy', 'it', 'italia'],
  japan: ['japan', 'jp'],
  canada: ['canada', 'ca'],
  australia: ['australia', 'au'],
  brazil: ['brazil', 'br', 'brasil'],
};

async function findCountryFromLocations(
  countryName: string,
  locations: CountryLocation[]
): Promise<CountryLocation | null> {
  const query = countryName.trim().toLowerCase();

  // Find canonical key from alias dictionary if present
  let matchedCanonical: string | null = null;
  for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (canonical === query || aliases.includes(query)) {
      matchedCanonical = canonical;
      break;
    }
  }

  // 1. Direct exact match against client country name or countryCode
  let country = locations.find(
    (loc) =>
      loc.country.toLowerCase() === query ||
      loc.countryCode.toLowerCase() === query
  );

  // 2. Exact match against alias group
  if (!country && matchedCanonical) {
    const aliasGroup = COUNTRY_ALIASES[matchedCanonical];
    country = locations.find((loc) => {
      const locCountry = loc.country.toLowerCase();
      const locCode = loc.countryCode.toLowerCase();
      return (
        locCountry === matchedCanonical ||
        locCode === matchedCanonical ||
        aliasGroup.includes(locCountry) ||
        aliasGroup.includes(locCode)
      );
    });
  }

  // 3. Prefix match against country name (minimum 3 characters to avoid short code collisions)
  if (!country && query.length > 2) {
    country = locations.find((loc) =>
      loc.country.toLowerCase().startsWith(query)
    );
  }

  // 4. Whole-word boundary match against country name (minimum 3 characters)
  if (!country && query.length > 2) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
    country = locations.find((loc) => regex.test(loc.country));
  }

  return country || null;
}
async function connectByCountryAndCity(
  countryName: string,
  cityName?: string
): Promise<{ success: boolean; message: string }> {
  const locations = await fetchServerLocations();
  const country = await findCountryFromLocations(countryName, locations);

  if (!country) {
    return { success: false, message: `Country "${countryName}" not found.` };
  }

  let city;
  if (cityName) {
    city = country.cities.find(
      (c) =>
        c.cityName.toLowerCase() === cityName.toLowerCase() ||
        c.cityName.toLowerCase().includes(cityName.toLowerCase())
    );
    if (!city) {
      return {
        success: false,
        message: `City "${cityName}" not found in ${country.country}.`,
      };
    }
  } else {
    city = country.cities[Math.floor(Math.random() * country.cities.length)];
  }

  try {
    const serverChanged = await selectRandomServerFromCity(
      country.countryCode,
      city.cityCode
    );
    if (!serverChanged) {
      return {
        success: false,
        message: `Failed to switch VPN server to ${city.cityName}, ${country.country}.`,
      };
    }
    return {
      success: true,
      message: `VPN server switched to ${city.cityName}, ${country.country}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error selecting server: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function detectActionFromInput(
  input: VpnControlInput
):
  | 'connect'
  | 'disconnect'
  | 'status'
  | 'list'
  | 'change_server'
  | 'list_cities'
  | 'list_servers'
  | 'open_account' {
  // If action is explicitly provided, normalize and inspect
  if (input.action) {
    const rawAction = (input.action as string)
      .toLowerCase()
      .replace(/[-_\s]+/g, '_')
      .trim();
    if (
      rawAction === 'open_account' ||
      rawAction === 'account' ||
      rawAction === 'open_my_account' ||
      rawAction.includes('account')
    ) {
      return 'open_account';
    }
    if (
      rawAction === 'disconnect' ||
      rawAction === 'deactivate' ||
      rawAction === 'stop'
    ) {
      return 'disconnect';
    }
    if (
      rawAction === 'connect' ||
      rawAction === 'activate' ||
      rawAction === 'start'
    ) {
      return 'connect';
    }
    if (
      rawAction === 'change_server' ||
      rawAction === 'server' ||
      rawAction === 'switch_server'
    ) {
      return 'change_server';
    }
    if (rawAction === 'list_cities' || rawAction === 'cities') {
      return 'list_cities';
    }
    if (rawAction === 'list_servers' || rawAction === 'servers') {
      return 'list_servers';
    }
    if (
      rawAction === 'list' ||
      rawAction === 'countries' ||
      rawAction === 'list_countries'
    ) {
      return 'list';
    }
    if (rawAction === 'status' || rawAction === 'info' || rawAction === 'ip') {
      return 'status';
    }
    return rawAction as
      | 'connect'
      | 'disconnect'
      | 'status'
      | 'list'
      | 'change_server'
      | 'list_cities'
      | 'list_servers'
      | 'open_account';
  }

  // Check if country or city was passed containing account keywords
  if (
    (input.country && input.country.toLowerCase().includes('account')) ||
    (input.city && input.city.toLowerCase().includes('account'))
  ) {
    return 'open_account';
  }

  // Default to status if no parameters
  if (!input.country && !input.city) {
    return 'status';
  }

  // If we have location parameters, default to connect
  return 'connect';
}

async function handleCountryCityOperation(
  input: VpnControlInput,
  action: 'list_cities' | 'list_servers'
): Promise<string> {
  if (!input.country) {
    const actionText = action === 'list_cities' ? 'cities' : 'servers';
    return `Please specify a country to list ${actionText} for. Example: 'Show ${actionText} in USA'`;
  }

  try {
    const locations = await fetchServerLocations();
    const country = await findCountryFromLocations(input.country, locations);

    if (!country) {
      return `Country "${input.country}" not found. Use 'list countries' to see available countries.`;
    }

    if (action === 'list_cities') {
      if (!country.cities.length) {
        return `No cities available in ${country.country}.`;
      }
      const cityNames = country.cities
        .map((cityItem: CityLocation) => cityItem.cityName)
        .sort();
      return `Cities available in ${country.country}: ${cityNames.join(', ')}`;
    }

    // list_servers action
    if (input.city) {
      const cityFound = country.cities.find(
        (cityItem: CityLocation) =>
          cityItem.cityName.toLowerCase() === input.city!.toLowerCase() ||
          cityItem.cityName.toLowerCase().includes(input.city!.toLowerCase())
      );

      if (!cityFound) {
        return `City "${input.city}" not found in ${country.country}. Available cities: ${country.cities.map((cityItem: CityLocation) => cityItem.cityName).join(', ')}`;
      }

      if (!cityFound.servers.length) {
        return `No servers available in ${cityFound.cityName}, ${country.country}.`;
      }

      return `Servers in ${cityFound.cityName}, ${country.country}:\n${cityFound.servers.map((server) => `• ${server}`).join('\n')}`;
    } else {
      let result = `Servers in ${country.country}:\n\n`;
      for (const cityItem of country.cities) {
        if (cityItem.servers.length > 0) {
          result += `${cityItem.cityName}:\n`;
          result +=
            cityItem.servers.map((server) => `• ${server}`).join('\n') + '\n\n';
        }
      }
      return result.trim();
    }
  } catch (error) {
    const actionText = action === 'list_cities' ? 'cities' : 'servers';
    return `Failed to retrieve ${actionText}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Control Mozilla VPN: connect, disconnect, check connection status, and list or select server locations.
 */
export default async function tool(input: VpnControlInput): Promise<string> {
  const action = detectActionFromInput(input);

  switch (action) {
    case 'open_account': {
      try {
        let userEmail: string | undefined;
        try {
          const status = await checkVpnStatus();
          userEmail = status.userEmail;
        } catch {
          // If status lookup fails, still proceed to open base portal
        }

        const accountUrl = userEmail
          ? `https://accounts.firefox.com/?email=${encodeURIComponent(userEmail)}`
          : 'https://accounts.firefox.com/';

        try {
          await open(accountUrl);
        } catch {
          const { execFile } = await import('child_process');
          execFile('open', [accountUrl]);
        }

        return userEmail
          ? `Opened Mozilla account portal in browser for ${userEmail}: ${accountUrl}`
          : `Opened Mozilla account portal in browser: ${accountUrl}`;
      } catch (error) {
        return `Failed to open account portal: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    case 'disconnect': {
      try {
        await runCommand('deactivate');
        await new Promise((resolve) =>
          setTimeout(resolve, DISCONNECT_DELAY_MS)
        );
        const status = await checkVpnStatus();
        if (!status.isActive) {
          notifyVpnStatusChange();
          return 'Mozilla VPN disconnected successfully.';
        } else {
          return 'Tried to disconnect, but VPN is still active. Please try again or use the VPN app directly.';
        }
      } catch (error) {
        return `Failed to disconnect Mozilla VPN: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    case 'status': {
      try {
        const status = await checkVpnStatus();
        const ip = await fetchCurrentIP();
        return `VPN is currently ${status.isActive ? 'connected' : 'disconnected'}.\nServer: ${status.serverCity}, ${status.serverCountry}\nIP address: ${ip}`;
      } catch (error) {
        return `Failed to retrieve VPN status: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    case 'list': {
      try {
        const locations = await fetchServerLocations();
        if (!locations.length) {
          return 'No VPN countries are currently available.';
        }
        const countryNames = locations.map((loc) => loc.country).sort();
        return `Available VPN countries: ${countryNames.join(', ')}`;
      } catch (error) {
        return `Failed to retrieve country list: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    case 'list_cities': {
      return await handleCountryCityOperation(input, 'list_cities');
    }

    case 'list_servers': {
      return await handleCountryCityOperation(input, 'list_servers');
    }

    case 'connect': {
      if (
        !input.country ||
        ['connect', 'activate', 'start', 'vpn'].includes(
          input.country.trim().toLowerCase()
        )
      ) {
        try {
          await runCommand('activate');
          await new Promise((resolve) => setTimeout(resolve, CONNECT_DELAY_MS));
          const status = await checkVpnStatus();
          if (status.isActive) {
            notifyVpnStatusChange();
            const newIp = await fetchCurrentIP();
            return `VPN connected using your last configuration.\nServer: ${status.serverCity}, ${status.serverCountry}\nNew IP address: ${newIp}`;
          } else {
            return 'Tried to connect, but VPN is still inactive. Please check the VPN app or try again.';
          }
        } catch (error) {
          return `Failed to connect VPN: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      const { success, message } = await connectByCountryAndCity(
        input.country,
        input.city
      );
      if (!success) {
        return message;
      }

      const shouldConnect = input.connect_after_change !== false;
      if (shouldConnect) {
        try {
          await runCommand('activate');
          await new Promise((resolve) =>
            setTimeout(resolve, SERVER_SWITCH_DELAY_MS)
          );

          let status = await checkVpnStatus();
          let retries = 0;

          while (!status.isActive && retries < MAX_CONNECTION_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            await runCommand('activate');
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_CONNECT_DELAY_MS)
            );
            status = await checkVpnStatus();
            retries++;
          }

          if (status.isActive) {
            notifyVpnStatusChange();
            const newIp = await fetchCurrentIP();
            return `${message}\nVPN connected successfully.\nServer: ${status.serverCity}, ${status.serverCountry}\nNew IP address: ${newIp}`;
          } else {
            notifyVpnStatusChange();
            return `${message}\nServer changed but failed to connect after ${MAX_CONNECTION_RETRIES + 1} attempts. Please try connecting manually or check the VPN app.`;
          }
        } catch (error) {
          notifyVpnStatusChange();
          return `${message}\nFailed to connect VPN: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      notifyVpnStatusChange();
      const currentStatus = await checkVpnStatus().catch(() => null);
      if (currentStatus?.isActive) {
        return `${message}\nVPN remains connected on ${currentStatus.serverCity}, ${currentStatus.serverCountry}.`;
      }
      return `${message}\nVPN server changed but not connected.`;
    }

    case 'change_server': {
      if (!input.country) {
        return 'Please specify a country to change the VPN server to (e.g. "Change server to Germany").';
      }

      let wasConnected = false;
      try {
        const currentStatus = await checkVpnStatus();
        wasConnected = currentStatus.isActive;
      } catch {
        // Silently continue if status check fails
      }

      const { success, message } = await connectByCountryAndCity(
        input.country,
        input.city
      );
      if (!success) {
        return message;
      }

      notifyVpnStatusChange();

      // Only connect if explicitly requested via connect_after_change=true,
      // or if VPN was ALREADY connected when the change was requested
      const shouldConnect =
        input.connect_after_change === true ||
        (input.connect_after_change === undefined && wasConnected);

      if (shouldConnect) {
        try {
          await runCommand('activate');
          await new Promise((resolve) =>
            setTimeout(resolve, SERVER_SWITCH_DELAY_MS)
          );

          let status = await checkVpnStatus();
          let retries = 0;

          while (!status.isActive && retries < MAX_CONNECTION_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            await runCommand('activate');
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_CONNECT_DELAY_MS)
            );
            status = await checkVpnStatus();
            retries++;
          }

          if (status.isActive) {
            notifyVpnStatusChange();
            const newIp = await fetchCurrentIP();
            return `${message}\nVPN connected successfully.\nServer: ${status.serverCity}, ${status.serverCountry}\nNew IP address: ${newIp}`;
          } else {
            return `${message}\nServer changed but failed to connect after ${MAX_CONNECTION_RETRIES + 1} attempts.`;
          }
        } catch (error) {
          return `${message}\nFailed to connect VPN: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      const currentStatus = await checkVpnStatus().catch(() => null);
      if (currentStatus?.isActive) {
        return `${message}\nVPN remains connected on ${currentStatus.serverCity}, ${currentStatus.serverCountry}.`;
      }
      return `${message}\nVPN server changed but not connected. Say 'connect' to activate the VPN.`;
    }

    default: {
      return "I'm not sure what you want to do. Please specify an action like connect, disconnect, status, or list countries.";
    }
  }
}
