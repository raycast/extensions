// src/utils/checkLoginService.ts
import { exec } from 'child_process';

interface LoginStatus {
  isAuthenticated: boolean;
}

// Execute a shell command and return the output as a promise
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

// Check if the user is authenticated
export const checkLoginStatus = (): Promise<LoginStatus> => {
  return executeCommand(
    '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN status'
  )
    .then((stdout) => {
      const isAuthenticated = !stdout.includes(
        'User status: not authenticated'
      );
      return { isAuthenticated };
    })
    .catch((err) => {
      console.error('Error checking login status:', err);
      throw new Error('Failed to retrieve login status');
    });
};
