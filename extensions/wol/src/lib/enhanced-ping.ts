import { exec } from "child_process";
import { NetworkInfo } from "../types";

// OS detection based on TTL values
function detectOSFromTTL(ttl: number): string {
  if (ttl <= 64) return "Linux/macOS";
  if (ttl <= 128) return "Windows";
  if (ttl <= 255) return "Network Device";
  return "Unknown";
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

// Enhanced ping that collects detailed network information
export function enhancedPing(ip: string, mac?: string, previousLastSeen?: Date): Promise<NetworkInfo> {
  return new Promise((resolve) => {
    if (!isValidIP(ip)) {
      resolve({
        isOnline: false,
        lastSeen: previousLastSeen,
      });
      return;
    }

    // Enhanced ping command with more details
    exec(`/sbin/ping -c 3 -W 1000 ${ip}`, (err, stdout) => {
      const networkInfo: NetworkInfo = {
        isOnline: false,
        // Keep previous lastSeen for offline devices
        lastSeen: previousLastSeen,
      };

      if (err) {
        // Device is offline - don't update lastSeen
        resolve(networkInfo);
        return;
      }

      // Device is online - update lastSeen to now
      networkInfo.isOnline = true;
      networkInfo.lastSeen = new Date();

      // Extract latency (response time)
      const timeMatch = stdout.match(/time=([0-9.]+)\s*ms/);
      if (timeMatch) {
        networkInfo.latency = parseFloat(timeMatch[1]);

        // Determine connection quality based on latency
        if (networkInfo.latency < 10) networkInfo.quality = "excellent";
        else if (networkInfo.latency < 50) networkInfo.quality = "good";
        else networkInfo.quality = "poor";
      }

      // Extract TTL
      const ttlMatch = stdout.match(/ttl=(\d+)/);
      if (ttlMatch) {
        networkInfo.ttl = parseInt(ttlMatch[1]);
        networkInfo.detectedOS = detectOSFromTTL(networkInfo.ttl);
      }

      // Calculate packet loss
      const lossMatch = stdout.match(/(\d+)% packet loss/);
      if (lossMatch) {
        networkInfo.packetLoss = parseInt(lossMatch[1]);
      }

      // MAC vendor lookup removed for simplicity

      // Try to get hostname via reverse DNS
      exec(`nslookup ${ip}`, (dnsErr, dnsStdout) => {
        if (!dnsErr) {
          const hostnameMatch = dnsStdout.match(/name = (.+?)\.$/m);
          if (hostnameMatch) {
            networkInfo.hostname = hostnameMatch[1];
          }
        }
        resolve(networkInfo);
      });
    });
  });
}

// Simple ping for compatibility with existing code
export function simplePing(ip: string): Promise<boolean> {
  return enhancedPing(ip).then((info) => info.isOnline);
}
