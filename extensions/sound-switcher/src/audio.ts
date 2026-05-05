import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AUDIO_DEVICES_BINARY = "audio-devices";

export type DeviceType = "input" | "output";

export type AudioDevice = {
  id: string;
  backendId: number;
  uid: string;
  name: string;
  type: DeviceType;
};

export type AudioDevicePair = {
  id: string;
  displayName: string;
  input: AudioDevice;
  output: AudioDevice;
  inputName: string;
  outputName: string;
  isCurrent: boolean;
};

export type AudioDeviceState = {
  pairs: AudioDevicePair[];
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  currentInput?: AudioDevice;
  currentOutput?: AudioDevice;
  currentPair?: AudioDevicePair;
  isMixedCurrent: boolean;
};

export class AudioDevicesBackendMissingError extends Error {
  constructor() {
    super("Bundled audio device helper is missing");
    this.name = "AudioDevicesBackendMissingError";
  }
}

export class AudioDevicesCommandError extends Error {
  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {
    super(`Audio device helper failed while trying to ${operation}`);
    this.name = "AudioDevicesCommandError";
  }
}

type CommandRunner = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export type AudioBackend = {
  listDevices(type: DeviceType): Promise<AudioDevice[]>;
  getCurrentDevice(type: DeviceType): Promise<AudioDevice | undefined>;
  setDevice(type: DeviceType, device: AudioDevice): Promise<void>;
};

type RawAudioDevice = {
  id: number;
  uid: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
};

export async function createMacOSAudioDevicesBackend(
  binary = join(process.cwd(), "assets", AUDIO_DEVICES_BINARY),
  runner: CommandRunner = execFileAsync,
): Promise<AudioBackend> {
  async function run(args: string[]) {
    try {
      return await runner(binary, args);
    } catch (error) {
      if (isMissingBinaryError(error)) {
        throw new AudioDevicesBackendMissingError();
      }

      throw new AudioDevicesCommandError(args.join(" "), error);
    }
  }

  return {
    async listDevices(type) {
      const result = await run(["list", `--${type}`, "--json"]);
      return parseAudioDevices(result.stdout, type);
    },
    async getCurrentDevice(type) {
      const result = await run([type, "get", "--json"]);
      return parseAudioDevice(result.stdout, type);
    },
    async setDevice(type, device) {
      await run([type, "set", String(device.backendId)]);
    },
  };
}

function isMissingBinaryError(error: unknown) {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT"
  );
}

function parseAudioDevices(stdout: string, type: DeviceType): AudioDevice[] {
  return (JSON.parse(stdout) as RawAudioDevice[]).map((device) => mapAudioDevice(device, type));
}

function parseAudioDevice(stdout: string, type: DeviceType): AudioDevice | undefined {
  const rawDevice = JSON.parse(stdout) as RawAudioDevice | undefined;
  return rawDevice ? mapAudioDevice(rawDevice, type) : undefined;
}

function mapAudioDevice(device: RawAudioDevice, type: DeviceType): AudioDevice {
  return {
    id: `${type}:${device.id}`,
    backendId: device.id,
    uid: device.uid,
    name: device.name,
    type,
  };
}

export function normalizeDeviceName(name: string): string {
  return name
    .replace(/\b(?:Microphone|Speakers|Speaker|Headphones|Headphone|Input|Output)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isVirtualDevice(name: string): boolean {
  return /\b(?:BlackHole|Soundflower|Loopback|VB-Cable|ZoomAudioDevice)\b/i.test(name);
}

export function buildAudioDeviceState(
  inputDevices: AudioDevice[],
  outputDevices: AudioDevice[],
  currentInput?: AudioDevice,
  currentOutput?: AudioDevice,
) {
  const outputsByNormalizedName = new Map<string, AudioDevice>();

  for (const output of outputDevices) {
    const displayName = normalizeDeviceName(output.name);
    if (!displayName || isVirtualDevice(output.name) || isVirtualDevice(displayName)) continue;
    if (!outputsByNormalizedName.has(displayName)) {
      outputsByNormalizedName.set(displayName, output);
    }
  }

  const pairs: AudioDevicePair[] = [];
  const seenDisplayNames = new Set<string>();

  for (const input of inputDevices) {
    const displayName = normalizeDeviceName(input.name);
    const output = outputsByNormalizedName.get(displayName);

    if (!displayName || !output || seenDisplayNames.has(displayName)) continue;
    if (isVirtualDevice(input.name) || isVirtualDevice(displayName)) continue;

    pairs.push({
      id: `${input.id}:${output.id}`,
      displayName,
      input,
      output,
      inputName: input.name,
      outputName: output.name,
      isCurrent: input.id === currentInput?.id && output.id === currentOutput?.id,
    });
    seenDisplayNames.add(displayName);
  }

  pairs.sort((left, right) => left.displayName.localeCompare(right.displayName));
  const sortedInputDevices = [...inputDevices].sort((left, right) => left.name.localeCompare(right.name));
  const sortedOutputDevices = [...outputDevices].sort((left, right) => left.name.localeCompare(right.name));

  const currentPair = pairs.find((pair) => pair.isCurrent);

  return {
    pairs,
    inputDevices: sortedInputDevices,
    outputDevices: sortedOutputDevices,
    currentInput,
    currentOutput,
    currentPair,
    isMixedCurrent: Boolean(currentInput && currentOutput && !currentPair),
  } satisfies AudioDeviceState;
}

export async function getAudioDeviceState(backend: AudioBackend): Promise<AudioDeviceState> {
  const [inputDevices, outputDevices, currentInput, currentOutput] = await Promise.all([
    backend.listDevices("input"),
    backend.listDevices("output"),
    backend.getCurrentDevice("input"),
    backend.getCurrentDevice("output"),
  ]);

  return buildAudioDeviceState(inputDevices, outputDevices, currentInput, currentOutput);
}

export async function switchAudioDevicePair(
  backend: AudioBackend,
  pair: AudioDevicePair,
  previousInput?: AudioDevice,
  previousOutput?: AudioDevice,
) {
  try {
    await backend.setDevice("output", pair.output);
    await backend.setDevice("input", pair.input);
  } catch (error) {
    await rollbackAudioDevices(backend, previousInput, previousOutput);
    throw error;
  }
}

async function rollbackAudioDevices(backend: AudioBackend, previousInput?: AudioDevice, previousOutput?: AudioDevice) {
  await Promise.allSettled([
    previousOutput ? backend.setDevice("output", previousOutput) : Promise.resolve(),
    previousInput ? backend.setDevice("input", previousInput) : Promise.resolve(),
  ]);
}
