export type TempSeverity = "normal" | "warm" | "hot" | "critical" | "unavailable";

export interface SensorReading {
  name: string; // raw sensor name, e.g. "PMU tdie1"
  label: string; // display name, e.g. "Die Sensor 1"
  temperature: number;
}

export interface TemperatureSnapshot {
  cpuMain: number; // average CPU temp in Celsius, -1 if unavailable
  cpuSensors: SensorReading[]; // die temperature sensors
  cpuMax: number; // max across sensors, -1 if unavailable
  gpuTemp: number; // GPU temp, -1 if unavailable
  allSensors: SensorReading[]; // every sensor for the detail view
  timestamp: number;
  isAppleSilicon: boolean;
  sensorAvailable: boolean;
  chipModel: string; // e.g. "Apple M4 Max"
  coreCount: number; // logical CPU cores
  machineModel: string; // e.g. "Mac16,5"
  dieSensorCount: number; // number of die temp sensors detected
}

export interface Preferences {
  temperatureUnit: "celsius" | "fahrenheit";
  refreshInterval: string;
  warningThreshold: string;
  criticalThreshold: string;
}
