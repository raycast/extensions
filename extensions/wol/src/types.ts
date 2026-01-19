interface WakeData {
  mac: string;
  ip: string;
  name: string;
  port: string;
}

interface PingJob {
  ip: string;
  index: number;
  previousSameIpIndex?: number | undefined;
}

// Enhanced network information we can collect
interface NetworkInfo {
  isOnline: boolean;
  latency?: number; // Response time in ms
  ttl?: number; // Time to Live (hints at OS)
  hostname?: string; // Reverse DNS lookup
  detectedOS?: string; // Based on TTL analysis
  lastSeen?: Date; // When device was last online
  packetLoss?: number; // Percentage of lost packets
  quality?: "excellent" | "good" | "poor"; // Connection quality
}

export type { WakeData, PingJob, NetworkInfo };
