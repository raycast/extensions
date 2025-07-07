// src/utils/vpnService.ts
import { exec } from 'child_process';

interface VpnStatus {
  isActive: boolean;
  serverCity: string;
  serverCountry: string;
  isAuthenticated: boolean;
}

// Execute a shell command and return the promise with the output
export const executeCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(new Error(`Execution failed: ${error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
};

// Run specific VPN commands e.g., activate, deactivate
export const runCommand = (
  action: 'activate' | 'deactivate'
): Promise<void> => {
  const command = `/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN ${action}`;
  return executeCommand(command)
    .then(() => {
      // Command executed successfully, no logging needed
    })
    .catch((err) => {
      throw err; // Re-throw the error to be handled by the caller
    });
};

// Better server information extraction with improved error handling
export const checkVpnStatus = async (): Promise<VpnStatus> => {
  try {
    const stdout = await executeCommand(
      '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN status'
    );

    const isActive = stdout.includes('VPN state: on');
    const isAuthenticated = !stdout.includes('User status: not authenticated');

    // Extract server city and country with improved parsing
    let serverCity = 'Unknown';
    let serverCountry = 'Unknown';

    // Try to find the city with more robust pattern matching
    const cityPatterns = [
      /Server city: ([^,\n]+)/i,
      /Server: ([^,\n]+)/i,
      /Location: ([^,\n]+)/i,
    ];

    for (const pattern of cityPatterns) {
      const match = stdout.match(pattern);
      if (match && match[1] && match[1].trim()) {
        serverCity = match[1].trim();
        break;
      }
    }

    // Try to find the country with more robust pattern matching
    const countryPatterns = [
      /Server country: ([^,\n]+)/i,
      /Country: ([^,\n]+)/i,
    ];

    for (const pattern of countryPatterns) {
      const match = stdout.match(pattern);
      if (match && match[1] && match[1].trim()) {
        serverCountry = match[1].trim();
        break;
      }
    }

    // If we found a city but not a country, try to extract from combined pattern
    if (serverCity !== 'Unknown' && serverCountry === 'Unknown') {
      const combinedMatch = stdout.match(/Server: ([^,]+), ([^\n]+)/i);
      if (combinedMatch && combinedMatch[2]) {
        serverCountry = combinedMatch[2].trim();
      }
    }

    return { isActive, serverCity, serverCountry, isAuthenticated };
  } catch (err) {
    throw new Error('Failed to retrieve VPN status');
  }
};
