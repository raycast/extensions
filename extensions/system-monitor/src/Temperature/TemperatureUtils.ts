import { execFile } from "child_process";
import { Color, environment } from "@raycast/api";
import path from "path";

export interface SensorReading {
  name: string;
  label: string;
  temperature: number;
}

export interface TemperatureData {
  cpuAverage: number;
  cpuMax: number;
  gpuAverage: number;
  sensors: SensorReading[];
  isAppleSilicon: boolean;
  sensorAvailable: boolean;
  chipModel: string;
  coreCount: number;
  dieSensorCount: number;
}

function sensorLabel(rawName: string): string {
  const lower = rawName.toLowerCase();
  const dieMatch = lower.match(/tdie(\d+)/);
  if (dieMatch) return `Die Sensor ${parseInt(dieMatch[1], 10)}`;
  const devMatch = lower.match(/tdev(\d+)/);
  if (devMatch) return `Device Sensor ${parseInt(devMatch[1], 10)}`;
  if (lower.includes("gpu")) return "GPU";
  if (lower.includes("battery") || lower.includes("gas gauge")) return "Battery";
  if (lower.includes("nand")) return "NAND Storage";
  return rawName;
}

export const getTemperatureData = async (): Promise<TemperatureData> => {
  const binaryPath = path.join(environment.assetsPath, "temperature-reader");

  return new Promise((resolve) => {
    execFile(binaryPath, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({
          cpuAverage: -1,
          cpuMax: -1,
          gpuAverage: -1,
          sensors: [],
          isAppleSilicon: false,
          sensorAvailable: false,
          chipModel: "Unknown",
          coreCount: 0,
          dieSensorCount: 0,
        });
        return;
      }

      try {
        const data = JSON.parse(stdout.trim());
        const sensors: SensorReading[] = (data.sensors || []).map((s: { name: string; temperature: number }) => ({
          name: s.name,
          label: sensorLabel(s.name),
          temperature: s.temperature,
        }));

        resolve({
          cpuAverage: data.cpuAverage ?? -1,
          cpuMax: data.cpuMax ?? -1,
          gpuAverage: data.gpuAverage ?? -1,
          sensors,
          isAppleSilicon: data.isAppleSilicon ?? false,
          sensorAvailable: data.sensorAvailable ?? false,
          chipModel: data.chipModel ?? "Unknown",
          coreCount: data.coreCount ?? 0,
          dieSensorCount: data.dieSensorCount ?? 0,
        });
      } catch {
        resolve({
          cpuAverage: -1,
          cpuMax: -1,
          gpuAverage: -1,
          sensors: [],
          isAppleSilicon: false,
          sensorAvailable: false,
          chipModel: "Unknown",
          coreCount: 0,
          dieSensorCount: 0,
        });
      }
    });
  });
};

export const formatTemperature = (tempCelsius: number): string => {
  if (tempCelsius <= 0) return "N/A";
  return `${Math.round(tempCelsius)} °C`;
};

export type TempSeverity = "normal" | "warm" | "hot" | "critical" | "unavailable";

export const getSeverity = (tempCelsius: number): TempSeverity => {
  if (tempCelsius <= 0) return "unavailable";
  if (tempCelsius >= 95) return "critical";
  if (tempCelsius >= 80) return "hot";
  if (tempCelsius >= 65) return "warm";
  return "normal";
};

export const severityColor = (severity: TempSeverity): Color => {
  switch (severity) {
    case "normal":
      return Color.Green;
    case "warm":
      return Color.Yellow;
    case "hot":
      return Color.Orange;
    case "critical":
      return Color.Red;
    case "unavailable":
      return Color.SecondaryText;
  }
};

export const severityLabel = (severity: TempSeverity): string => {
  switch (severity) {
    case "normal":
      return "Normal";
    case "warm":
      return "Warm";
    case "hot":
      return "Hot";
    case "critical":
      return "Critical";
    case "unavailable":
      return "Unavailable";
  }
};
