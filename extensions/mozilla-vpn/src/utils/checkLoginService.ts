// src/utils/checkLoginService.ts
import { execFile } from 'child_process';

const MOZILLA_VPN_BINARY =
  '/Applications/Mozilla VPN.app/Contents/MacOS/Mozilla VPN';

interface LoginStatus {
  isAuthenticated: boolean;
}

// Check if the user is authenticated
export const checkLoginStatus = (): Promise<LoginStatus> => {
  return new Promise((resolve, reject) => {
    execFile(MOZILLA_VPN_BINARY, ['status'], (error, stdout, stderr) => {
      if (error) {
        console.error('Error checking login status:', stderr || error.message);
        reject(new Error('Failed to retrieve login status'));
        return;
      }
      const isAuthenticated = !stdout.includes(
        'User status: not authenticated'
      );
      resolve({ isAuthenticated });
    });
  });
};
