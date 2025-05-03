// src/utils/vpnService.ts
import { exec } from 'child_process';

interface VpnStatus {
  isActive: boolean;
  serverCity: string;
  isAuthenticated: boolean;
}

// Execute a shell command and return the promise with the output
const executeCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error:', stderr);
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
      console.log(`VPN ${action} command executed successfully.`);
    })
    .catch((err) => {
      console.error(`Failed to ${action} VPN:`, err);
      throw err; // Re-throw the error to be handled or logged by the caller
    });
};

// Check the current status of the VPN
export const checkVpnStatus = (): Promise<VpnStatus> => {
  return executeCommand(
    '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN status'
  )
    .then((stdout) => {
      const isActive = stdout.includes('VPN state: on');
      const serverCityMatch = stdout.match(/Server city: (.+)/);
      const serverCity = serverCityMatch
        ? serverCityMatch[1].trim()
        : 'Unknown';
      const isAuthenticated = !stdout.includes(
        'User status: not authenticated'
      );
      return { isActive, serverCity, isAuthenticated };
    })
    .catch((err) => {
      console.error('Error checking VPN status:', err);
      throw new Error('Failed to retrieve VPN status');
    });
};
