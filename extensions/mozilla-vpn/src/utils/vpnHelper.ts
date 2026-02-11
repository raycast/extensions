import fs from 'fs';

export const MOZILLA_VPN_PATH = '/Applications/Mozilla VPN.app';

export const isMozillaVPNInstalled = (): boolean => {
  try {
    return fs.existsSync(MOZILLA_VPN_PATH);
  } catch (error) {
    console.error('Error checking Mozilla VPN installation:', error);
    return false;
  }
};
