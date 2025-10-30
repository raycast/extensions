export interface LogEntry {
  timestamp: Date;
  dateString: string;
  eventType: "launched" | "connected" | "disconnected" | "active" | "inactive" | "found" | "enabled";
  deviceType: "Audio" | "Video" | "System" | "Unknown";
  deviceName: string;
  message: string;
  rawLine: string;
}

export type EventTypeColors = {
  [K in LogEntry["eventType"]]: string;
};

export type DeviceTypeColors = {
  [K in LogEntry["deviceType"]]: string;
};
