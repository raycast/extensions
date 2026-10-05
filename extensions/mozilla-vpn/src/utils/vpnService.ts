// src/utils/vpnService.ts
import { execFile } from 'child_process';

const MOZILLA_VPN_BINARY =
  '/Applications/Mozilla VPN.app/Contents/MacOS/Mozilla VPN';

export interface VpnStatus {
  isActive: boolean;
  serverCity: string;
  serverCountry: string;
  isAuthenticated: boolean;
  userEmail?: string;
  userDisplayName?: string;
}

// Helper to run Mozilla VPN CLI with argument array
export const runVpnCli = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    execFile(MOZILLA_VPN_BINARY, args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Execution failed: ${error.message || stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
};

// Execute a command for backwards compatibility
export const executeCommand = (command: string): Promise<string> => {
  const parts = command.trim().split(/\s+/);
  const action = parts[parts.length - 1];
  return runVpnCli([action]);
};

// Run specific VPN commands e.g., activate, deactivate
export const runCommand = (
  action: 'activate' | 'deactivate'
): Promise<void> => {
  return runVpnCli([action])
    .then(() => {
      // Command executed successfully
    })
    .catch((err) => {
      throw err;
    });
};

// Better server information extraction with improved error handling
export const checkVpnStatus = async (): Promise<VpnStatus> => {
  try {
    const stdout = await runVpnCli(['status']);

    const isActive = stdout.includes('VPN state: on');
    const isAuthenticated = !stdout.includes('User status: not authenticated');

    // Extract server city and country with improved parsing
    let serverCity = 'Unknown';
    let serverCountry = 'Unknown';

    // Patterns allow comma-separated city/region (e.g. "Seattle, WA")
    const cityPatterns = [
      /Server city:\s*([^\r\n]+)/i,
      /Server:\s*([^\r\n]+)/i,
      /Location:\s*([^\r\n]+)/i,
    ];

    for (const pattern of cityPatterns) {
      const match = stdout.match(pattern);
      if (match && match[1] && match[1].trim()) {
        serverCity = match[1].trim();
        break;
      }
    }

    const countryPatterns = [
      /Server country:\s*([^\r\n]+)/i,
      /Country:\s*([^\r\n]+)/i,
    ];

    for (const pattern of countryPatterns) {
      const match = stdout.match(pattern);
      if (match && match[1] && match[1].trim()) {
        serverCountry = match[1].trim();
        break;
      }
    }

    // If we found a city but not a country, try combined pattern
    if (serverCity !== 'Unknown' && serverCountry === 'Unknown') {
      const combinedMatch = stdout.match(/Server:\s*([^,]+),\s*([^\r\n]+)/i);
      if (combinedMatch && combinedMatch[2]) {
        serverCountry = combinedMatch[2].trim();
      }
    }

    // Extract user email and display name if authenticated
    const emailMatch = stdout.match(/User email:\s*([^\r\n]+)/i);
    const userEmail =
      emailMatch && emailMatch[1] ? emailMatch[1].trim() : undefined;

    const displayNameMatch = stdout.match(/User displayName:\s*([^\r\n]+)/i);
    const userDisplayName =
      displayNameMatch && displayNameMatch[1]
        ? displayNameMatch[1].trim()
        : undefined;

    return {
      isActive,
      serverCity,
      serverCountry,
      isAuthenticated,
      userEmail,
      userDisplayName,
    };
  } catch (err) {
    throw new Error('Failed to retrieve VPN status');
  }
};
