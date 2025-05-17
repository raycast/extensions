import fs from 'fs';

export const MOZILLA_VPN_PATH = '/Applications/Mozilla Vpn.app';

export const isMozillaVpnInstalled = (): boolean => {
  try {
    return fs.existsSync(MOZILLA_VPN_PATH);
  } catch (error) {
    console.error('Error checking Mozilla Vpn installation:', error);
    return false;
  }
};
