// src/utils/serverUtils.ts
import { execFile } from 'child_process';
import { showToast, Toast } from '@raycast/api';

// Types for server data structure
export interface VpnServer {
  serverName: string;
}

export interface CityLocation {
  cityName: string;
  cityCode: string;
  servers: string[];
}

export interface CountryLocation {
  country: string;
  countryCode: string;
  cities: CityLocation[];
}

// Parse the output of the 'servers' command
export function parseServersOutput(output: string): CountryLocation[] {
  const locations: CountryLocation[] = [];
  let currentCountry: CountryLocation | null = null;
  let currentCity: CityLocation | null = null;

  const lines = output.split('\n');
  for (const line of lines) {
    const countryMatch = line.match(/- Country: (.+) \(code: (.+)\)/);
    if (countryMatch) {
      currentCountry = {
        country: countryMatch[1],
        countryCode: countryMatch[2],
        cities: [],
      };
      locations.push(currentCountry);
      continue;
    }

    const cityMatch = line.match(/- City: (.+) \((.+)\)/);
    if (cityMatch && currentCountry) {
      currentCity = {
        cityName: cityMatch[1],
        cityCode: cityMatch[2],
        servers: [],
      };
      currentCountry.cities.push(currentCity);
      continue;
    }

    const serverMatch = line.match(/- Server: (.+)/);
    if (serverMatch && currentCountry && currentCity) {
      const serverName = serverMatch[1];
      currentCity.servers.push(serverName);
    }
  }

  return locations;
}

// Get all server locations
export const fetchServerLocations = (): Promise<CountryLocation[]> => {
  return new Promise((resolve, reject) => {
    execFile(
      '/Applications/Mozilla VPN.app/Contents/MacOS/Mozilla VPN',
      ['servers'],
      (error, stdout, stderr) => {
        if (error) {
          console.error('Failed to fetch servers:', stderr);
          reject(new Error('Failed to fetch server list'));
          return;
        }
        const locations = parseServersOutput(stdout);
        resolve(locations);
      }
    );
  });
};

// Validate server name to prevent injection
const isValidServerName = (serverName: string): boolean => {
  // Allow alphanumeric characters, dots, hyphens, underscores, and spaces
  // Adjust this regex based on what Mozilla VPN actually accepts
  return (
    /^[a-zA-Z0-9.\-_ ]+$/.test(serverName) &&
    serverName.length > 0 &&
    serverName.length < 100
  );
};

// Select a specific server
export const selectServer = (serverName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Validate the server name first
    if (!isValidServerName(serverName)) {
      const error = new Error('Invalid server name format');
      console.error('Invalid server name:', serverName);
      showToast(Toast.Style.Failure, 'Invalid server name');
      reject(error);
      return;
    }

    execFile(
      '/Applications/Mozilla VPN.app/Contents/MacOS/Mozilla VPN',
      ['select', serverName],
      async (error, stdout, stderr) => {
        if (error) {
          console.error('Failed to select server:', stderr);
          await showToast(Toast.Style.Failure, 'Failed to select server');
          reject(new Error('Failed to select server'));
          return;
        }
        await showToast(Toast.Style.Success, 'Server changed successfully');
        resolve();
      }
    );
  });
};

// Select a random server from a specific city
export const selectRandomServerFromCity = async (
  countryCode: string,
  cityCode: string
): Promise<boolean> => {
  try {
    const locations = await fetchServerLocations();
    const country = locations.find((c) => c.countryCode === countryCode);

    if (!country) {
      await showToast(Toast.Style.Failure, `Country not found: ${countryCode}`);
      return false;
    }

    const city = country.cities.find((city) => city.cityCode === cityCode);

    if (!city || city.servers.length === 0) {
      await showToast(Toast.Style.Failure, `No servers found in ${cityCode}`);
      return false;
    }

    // Pick a random server
    const randomServer =
      city.servers[Math.floor(Math.random() * city.servers.length)];
    console.log(`Selecting random server: ${randomServer}`);

    // Select the server
    await selectServer(randomServer);

    // Small delay to let the selection take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return true;
  } catch (error) {
    console.error('Error selecting random server:', error);
    await showToast(Toast.Style.Failure, 'Failed to select server');
    return false;
  }
};
