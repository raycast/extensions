import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { environment } from "@raycast/api";
import { SensorReading, TemperatureSnapshot } from "./types";

const execFileAsync = promisify(execFile);

interface NativeSensor {
  name: string;
  temperature: number;
}

interface NativeResult {
  sensors: NativeSensor[];
  cpuAverage: number;
  cpuMax: number;
  gpuAverage: number;
  isAppleSilicon: boolean;
  sensorAvailable: boolean | number;
  chipModel: string;
  coreCount: number;
  machineModel: string;
  dieSensorCount: number;
}

function sensorLabel(name: string): string {
  // "PMU tdie1" -> "Die Sensor 1"
  const dieMatch = name.match(/tdie(\d+)/i);
  if (dieMatch) return `Die Sensor ${dieMatch[1]}`;

  // "PMU tdev3" -> "Device Sensor 3"
  const devMatch = name.match(/tdev(\d+)/i);
  if (devMatch) return `Device Sensor ${devMatch[1]}`;

  // "PMU tcal" -> "Calibration"
  if (name.toLowerCase().includes("tcal")) return "Calibration";

  // "gas gauge battery" -> "Battery"
  if (name.toLowerCase().includes("battery")) return "Battery";

  // "NAND CH0 temp" -> "NAND Storage"
  if (name.toLowerCase().includes("nand")) return "NAND Storage";

  return name;
}

function toSensorReading(s: NativeSensor): SensorReading {
  return { name: s.name, label: sensorLabel(s.name), temperature: s.temperature };
}

export async function readTemperatures(): Promise<TemperatureSnapshot> {
  try {
    const binaryPath = resolve(environment.assetsPath, "temperature-reader");
    const { stdout } = await execFileAsync(binaryPath, [], { timeout: 5000 });
    const result: NativeResult = JSON.parse(stdout.trim());

    const allSensors = result.sensors.map(toSensorReading);

    const cpuSensors = allSensors
      .filter((s) => s.name.toLowerCase().includes("die"))
      .sort((a, b) => a.temperature - b.temperature);

    return {
      cpuMain: result.cpuAverage,
      cpuSensors,
      cpuMax: result.cpuMax,
      gpuTemp: result.gpuAverage,
      allSensors,
      timestamp: Date.now(),
      isAppleSilicon: result.isAppleSilicon,
      sensorAvailable: !!result.sensorAvailable,
      chipModel: result.chipModel || "Unknown",
      coreCount: result.coreCount || 0,
      machineModel: result.machineModel || "Unknown",
      dieSensorCount: result.dieSensorCount || 0,
    };
  } catch {
    return {
      cpuMain: -1,
      cpuSensors: [],
      cpuMax: -1,
      gpuTemp: -1,
      allSensors: [],
      timestamp: Date.now(),
      isAppleSilicon: false,
      sensorAvailable: false,
      chipModel: "Unknown",
      coreCount: 0,
      machineModel: "Unknown",
      dieSensorCount: 0,
    };
  }
}
