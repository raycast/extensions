// src/utils/vpnCache.ts
import { Cache } from '@raycast/api';

const cache = new Cache();
const VPN_STATUS_KEY = 'vpn_status_timestamp';

export function notifyVpnStatusChange() {
  // Update cache with current timestamp to signal change
  const timestamp = Date.now().toString();
  console.log('VPN status change notification sent:', timestamp);
  cache.set(VPN_STATUS_KEY, timestamp);
}

export function getVpnStatusTimestamp(): number {
  const timestamp = cache.get(VPN_STATUS_KEY);
  return timestamp ? parseInt(timestamp, 10) : 0;
}

export function subscribeToVpnStatusChange(callback: () => void): () => void {
  return cache.subscribe((key) => {
    if (key === VPN_STATUS_KEY) {
      callback();
    }
  });
}
