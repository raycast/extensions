// src/tools/mozilla-vpn-control.ts

import {
  fetchServerLocations,
  selectRandomServerFromCity,
  CountryLocation,
  CityLocation,
} from '../utils/serverUtils';
import { runCommand, checkVpnStatus } from '../utils/vpnService';
import { fetchCurrentIP } from '../utils/fetchCurrentIP';

// Timing constants for VPN operations
const DISCONNECT_DELAY_MS = 4000;
const CONNECT_DELAY_MS = 2000;
const SERVER_SWITCH_DELAY_MS = 4000;
const RETRY_DELAY_MS = 2000;
const RETRY_CONNECT_DELAY_MS = 3000;
const MAX_CONNECTION_RETRIES = 2;

type VpnControlInput = {
  action?:
    | 'connect'
    | 'disconnect'
    | 'status'
    | 'list'
    | 'list_cities'
    | 'list_servers'
    | 'change_server';
  country?: string;
  city?: string;
  connect_after_change?: boolean;
};

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'USA',
  'united states': 'USA',
  'united states of america': 'USA',
  us: 'USA',
  uk: 'UK',
  'united kingdom': 'UK',
  'great britain': 'UK',
  gb: 'UK',
  gbr: 'UK',
  de: 'Germany',
  deu: 'Germany',
};

function normalizeCountryName(countryName: string): string {
  return COUNTRY_ALIASES[countryName.trim().toLowerCase()] || countryName;
}

async function findCountryFromLocations(
  countryName: string,
  locations: CountryLocation[]
): Promise<CountryLocation | null> {
  const normalizedName = normalizeCountryName(countryName);

  // Exact match first
  let country = locations.find(
    (loc) =>
      loc.country.toLowerCase() === normalizedName.toLowerCase() ||
      loc.countryCode.toLowerCase() === normalizedName.toLowerCase()
  );

  // Partial match fallback
  if (!country) {
    country = locations.find(
      (loc) =>
        loc.country.toLowerCase().includes(normalizedName.toLowerCase()) ||
        loc.countryCode.toLowerCase().includes(normalizedName.toLowerCase())
    );
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
  | 'list_servers' {
  // If action is explicitly provided, use it
  if (input.action) {
    return input.action;
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

export default async function tool(input: VpnControlInput): Promise<string> {
  const action = detectActionFromInput(input);

  switch (action) {
    case 'disconnect': {
      try {
        await runCommand('deactivate');
        await new Promise((resolve) =>
          setTimeout(resolve, DISCONNECT_DELAY_MS)
        );
        const status = await checkVpnStatus();
        if (!status.isActive) {
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

    case 'connect':
    case 'change_server': {
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
            const newIp = await fetchCurrentIP();
            return `VPN connected using your last configuration.\nServer: ${status.serverCity}, ${status.serverCountry}\nNew IP address: ${newIp}`;
          } else {
            return 'Tried to connect, but VPN is still inactive. Please check the VPN app or try again.';
          }
        } catch (error) {
          return `Failed to connect VPN: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      if (!input.country) {
        return 'Country is required for this action.';
      }

      let wasConnected = false;
      try {
        const currentStatus = await checkVpnStatus();
        wasConnected = currentStatus.isActive;
      } catch (error) {
        // Silently continue if status check fails
      }

      const { success, message } = await connectByCountryAndCity(
        input.country,
        input.city
      );
      if (!success) {
        return message;
      }

      const shouldConnect =
        action === 'connect' ||
        (input.country && input.city) ||
        wasConnected ||
        ['connect', 'activate', 'start'].some((keyword) =>
          input.country!.trim().toLowerCase().includes(keyword)
        );

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
            const newIp = await fetchCurrentIP();
            return `${message}\nVPN connected successfully.\nServer: ${status.serverCity}, ${status.serverCountry}\nNew IP address: ${newIp}`;
          } else {
            return `${message}\nServer changed but failed to connect after ${MAX_CONNECTION_RETRIES + 1} attempts. Please try connecting manually or check the VPN app.`;
          }
        } catch (error) {
          return `${message}\nFailed to connect VPN: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      return `${message}\nVPN server changed but not connected. Say 'connect' to activate the VPN.`;
    }

    default: {
      return "I'm not sure what you want to do. Please specify an action like connect, disconnect, status, or list countries.";
    }
  }
}
