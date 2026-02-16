import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import { Icon, LocalStorage } from "@raycast/api";
import { access, mkdir, readFile, rename, writeFile, unlink } from "fs/promises";
import { constants as fsConstants } from "fs";
import { createHash } from "crypto";
import { dirname, join } from "path";
import { homedir, tmpdir } from "os";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const LSAPPINFO_PATH = "/usr/bin/lsappinfo";
const FINETUNE_APP_PATH = "/Applications/FineTune.app";
const FINETUNE_SETTINGS_PATH = join(
  homedir(),
  "Library/Containers/com.finetuneapp.FineTune/Data/Library/Application Support/FineTune/settings.json",
);
const FINETUNE_SETTINGS_DIR = dirname(FINETUNE_SETTINGS_PATH);

interface FineTuneSettings {
  appDeviceRouting: Record<string, string>;
  appMutes: Record<string, boolean>;
  appEQSettings: Record<string, unknown>;
  appVolumes: Record<string, number>;
  version: number;
}

interface FineTuneSettingsBackupPayload {
  savedAt: number;
  settings: FineTuneSettings;
}

// Types
export interface AudioDevice {
  name: string;
  uid: string;
  isOutput: boolean;
  isInput: boolean;
  isDefault: boolean;
  id?: number;
}

export interface AudioApp {
  name: string;
  bundleId: string;
  path: string;
  isRunning: boolean;
  activeOutputDetected?: boolean;
}

interface RunningProcessApp {
  name: string;
  bundleId: string;
  path: string;
  background?: boolean;
}

export interface AppStatus {
  volume: number | null;
  state: "playing" | "paused" | "stopped" | "unknown";
}

export interface VolumeInfo {
  volume: number; // 0-100
  muted: boolean;
}

const HEADPHONE_DEVICE_KEYWORDS = [
  "headphone",
  "headset",
  "airpod",
  "earbud",
  "earbuds",
  "earphone",
  "earphones",
  "earpods",
  "jabra",
  "beats",
  "bose qc",
  "sony wh",
  "plantronics",
];

function isHeadphoneOutputDeviceName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return HEADPHONE_DEVICE_KEYWORDS.some((keyword) => lowerName.includes(keyword));
}

export function getOutputDeviceIconSourceFromName(name: string | null | undefined): Icon {
  if (name && isHeadphoneOutputDeviceName(name)) {
    return Icon.Headphones;
  }

  return Icon.Speaker;
}

export function getOutputDeviceIconSource(device: AudioDevice | null | undefined): Icon {
  return getOutputDeviceIconSourceFromName(device?.name);
}

const ACTIVE_OUTPUT_CACHE_TTL_MS = 1200;
const ACTIVE_OUTPUT_LOOKUP_TIMEOUT_MS = 600;
const RUNNING_PROCESSES_CACHE_TTL_MS = 1200;
const FINETUNE_INSTALL_CACHE_TTL_MS = 5000;
const FINETUNE_SETTINGS_CACHE_TTL_MS = 1500;
const FINETUNE_TOGGLE_STATE_KEY = "finetune_toggle_state_v1";
const FINETUNE_TOGGLE_BACKUP_KEY = "finetune_toggle_backup_v1";

let activeOutputBundleIdsCache: { value: string[]; expiresAt: number } | null = null;
let activeOutputBundleIdsPromise: Promise<string[]> | null = null;

let runningProcessesCache: { value: RunningProcessApp[]; expiresAt: number } | null = null;
let runningProcessesPromise: Promise<RunningProcessApp[]> | null = null;

let fineTuneInstalledCache: { value: boolean; expiresAt: number } | null = null;
let fineTuneInstalledPromise: Promise<boolean> | null = null;

let fineTuneSettingsCache: { value: FineTuneSettings; expiresAt: number } | null = null;
let fineTuneSettingsPromise: Promise<FineTuneSettings> | null = null;

// Swift Switcher Code (Native CoreAudio)
const SWIFT_AUDIO_CONTROL_CODE = `
import CoreAudio
import Foundation

struct AudioDevice: Encodable {
    let id: UInt32
    let name: String
    let uid: String
    let isOutput: Bool
    let isDefault: Bool
}

func getDeviceList() -> [AudioDevice] {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var dataSize: UInt32 = 0
    let status = AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize)
    guard status == noErr else { return [] }

    let deviceCount = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
    var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
    
    _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize, &deviceIDs)

    // Get default output device
    var defaultAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var defaultDeviceID: AudioDeviceID = 0
    var defaultSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &defaultAddress, 0, nil, &defaultSize, &defaultDeviceID)

    var devices: [AudioDevice] = []

    for id in deviceIDs {
        // Check for output channels
        var configAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreamConfiguration,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain
        )
        var configSize: UInt32 = 0
        _ = AudioObjectGetPropertyDataSize(id, &configAddress, 0, nil, &configSize)
        
        var isOutput = false
        if configSize > 0 {
            // Allocate raw memory for AudioBufferList
            let bufferList = UnsafeMutableRawPointer.allocate(byteCount: Int(configSize), alignment: MemoryLayout<UInt32>.alignment)
            defer { bufferList.deallocate() }
            
            let status = AudioObjectGetPropertyData(id, &configAddress, 0, nil, &configSize, bufferList)
            
            if status == noErr {
                // AudioBufferList layout:
                // mNumberBuffers: UInt32 (offset 0)
                // padding: 4 bytes (offset 4) -> because AudioBuffer contains a pointer, aligning to 8 bytes on 64-bit
                // mBuffers: [AudioBuffer] (offset 8)
                
                let mNumberBuffers = bufferList.load(as: UInt32.self)
                
                // Iterate buffers to check channels
                // AudioBuffer layout:
                // mNumberChannels: UInt32 (0)
                // mDataByteSize: UInt32 (4)
                // mData: Pointer (8)
                // Total size: 16 bytes
                
                for i in 0..<Int(mNumberBuffers) {
                    let offset = 8 + (i * 16)
                    if offset + 16 <= Int(configSize) {
                        let mNumberChannels = bufferList.load(fromByteOffset: offset, as: UInt32.self)
                        if mNumberChannels > 0 {
                            isOutput = true
                            break
                        }
                    }
                }
            }
        }
        
        if isOutput {
            // Name
            var nameSize = UInt32(MemoryLayout<CFString>.size)
            var deviceName: CFString = "" as CFString
            var nameAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyDeviceNameCFString,
                mScope: kAudioObjectPropertyScopeGlobal,
                mElement: kAudioObjectPropertyElementMain
            )
            _ = AudioObjectGetPropertyData(id, &nameAddress, 0, nil, &nameSize, &deviceName)
            
            // UID
            var uidSize = UInt32(MemoryLayout<CFString>.size)
            var deviceUID: CFString = "" as CFString
            var uidAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyDeviceUID,
                mScope: kAudioObjectPropertyScopeGlobal,
                mElement: kAudioObjectPropertyElementMain
            )
            _ = AudioObjectGetPropertyData(id, &uidAddress, 0, nil, &uidSize, &deviceUID)
            
            devices.append(AudioDevice(
                id: id,
                name: deviceName as String,
                uid: deviceUID as String,
                isOutput: true,
                isDefault: id == defaultDeviceID
            ))
        }
    }
    return devices
}

func getAllDeviceIDs() -> [AudioDeviceID] {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var dataSize: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize) == noErr else {
        return []
    }

    let deviceCount = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
    var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
    _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize, &deviceIDs)
    return deviceIDs
}

func getDeviceUID(id: AudioDeviceID) -> String? {
    var uidSize = UInt32(MemoryLayout<CFString>.size)
    var deviceUID: CFString = "" as CFString
    var uidAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceUID,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    let status = AudioObjectGetPropertyData(id, &uidAddress, 0, nil, &uidSize, &deviceUID)
    guard status == noErr else { return nil }
    return deviceUID as String
}

func findDeviceID(uid: String) -> AudioDeviceID? {
    for id in getAllDeviceIDs() {
        if let currentUID = getDeviceUID(id: id), currentUID == uid {
            return id
        }
    }
    return nil
}

func setDefaultDevice(selector: AudioObjectPropertySelector, uid: String) -> Bool {
    guard let foundID = findDeviceID(uid: uid) else { return false }

    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var deviceID = foundID
    let size = UInt32(MemoryLayout<AudioDeviceID>.size)
    let status = AudioObjectSetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, size, &deviceID)

    if status == noErr {
        var currentDeviceID: AudioDeviceID = 0
        var defaultSize = UInt32(MemoryLayout<AudioDeviceID>.size)
        _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &defaultSize, &currentDeviceID)
        return currentDeviceID == deviceID
    }

    return false
}

func setOutputDevice(uid: String) -> Bool {
    return setDefaultDevice(selector: kAudioHardwarePropertyDefaultOutputDevice, uid: uid)
}

func setInputDevice(uid: String) -> Bool {
    return setDefaultDevice(selector: kAudioHardwarePropertyDefaultInputDevice, uid: uid)
}

func getDefaultDeviceUID(selector: AudioObjectPropertySelector) -> String {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var defaultDeviceID: AudioDeviceID = 0
    var defaultSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &defaultSize, &defaultDeviceID) == noErr else {
        return ""
    }
    return getDeviceUID(id: defaultDeviceID) ?? ""
}

func getProcessObjectIDs() -> [AudioObjectID] {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyProcessObjectList,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var dataSize: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize) == noErr else {
        return []
    }

    let processCount = Int(dataSize) / MemoryLayout<AudioObjectID>.size
    var processIDs = [AudioObjectID](repeating: 0, count: processCount)

    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &propertyAddress, 0, nil, &dataSize, &processIDs) == noErr else {
        return []
    }

    return processIDs
}

func getProcessFlag(processID: AudioObjectID, selector: AudioObjectPropertySelector) -> Bool {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var value: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    guard AudioObjectGetPropertyData(processID, &propertyAddress, 0, nil, &size, &value) == noErr else {
        return false
    }

    return value != 0
}

func getProcessBundleID(processID: AudioObjectID) -> String? {
    var propertyAddress = AudioObjectPropertyAddress(
        mSelector: kAudioProcessPropertyBundleID,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    var size = UInt32(MemoryLayout<CFString>.size)
    var bundleID: CFString = "" as CFString
    guard AudioObjectGetPropertyData(processID, &propertyAddress, 0, nil, &size, &bundleID) == noErr else {
        return nil
    }

    let value = (bundleID as String).trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty ? nil : value
}

func getActiveOutputBundleIDs() -> [String] {
    var unique = Set<String>()

    for processID in getProcessObjectIDs() {
        guard getProcessFlag(processID: processID, selector: kAudioProcessPropertyIsRunningOutput) else {
            continue
        }

        if let bundleID = getProcessBundleID(processID: processID) {
            unique.insert(bundleID)
        }
    }

    return Array(unique).sorted()
}

let args = CommandLine.arguments
if args.count > 2 {
    let command = args[1]
    let targetUID = args[2]
    if command == "--set-output" {
        if setOutputDevice(uid: targetUID) {
            print("Success")
        } else {
            print("Failed")
            exit(1)
        }
    } else if command == "--set-input" {
        if setInputDevice(uid: targetUID) {
            print("Success")
        } else {
            print("Failed")
            exit(1)
        }
    } else {
        print("Failed")
        exit(1)
    }
} else if args.count > 1 {
    let command = args[1]
    if command == "--active-output-bundle-ids" {
        let encoder = JSONEncoder()
        if let data = try? encoder.encode(getActiveOutputBundleIDs()), let json = String(data: data, encoding: .utf8) {
            print(json)
        } else {
            print("[]")
        }
    } else if command == "--get-default-input-uid" {
        print(getDefaultDeviceUID(selector: kAudioHardwarePropertyDefaultInputDevice))
    } else if command == "--get-default-output-uid" {
        print(getDefaultDeviceUID(selector: kAudioHardwarePropertyDefaultOutputDevice))
    } else {
        // Legacy behavior: first arg is output UID.
        let targetUID = args[1]
        if setOutputDevice(uid: targetUID) {
            print("Success")
        } else {
            print("Failed")
            exit(1)
        }
    }
} else {
    let devices = getDeviceList()
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(devices), let json = String(data: data, encoding: .utf8) {
        print(json)
    }
}
`;

const AUDIO_CONTROL_BINARY_PATH = join(tmpdir(), "finetune-audio-control");
const AUDIO_CONTROL_VERSION_PATH = `${AUDIO_CONTROL_BINARY_PATH}.version`;
const AUDIO_CONTROL_VERSION = createHash("sha256").update(SWIFT_AUDIO_CONTROL_CODE).digest("hex");
let ensureAudioControlBinaryPromise: Promise<string> | null = null;

async function ensureAudioControlBinary(): Promise<string> {
  if (ensureAudioControlBinaryPromise) {
    return ensureAudioControlBinaryPromise;
  }

  ensureAudioControlBinaryPromise = (async () => {
    let binaryIsCurrent = false;
    try {
      const [currentVersion] = await Promise.all([
        readFile(AUDIO_CONTROL_VERSION_PATH, "utf8"),
        access(AUDIO_CONTROL_BINARY_PATH, fsConstants.X_OK),
      ]);
      binaryIsCurrent = currentVersion.trim() === AUDIO_CONTROL_VERSION;
    } catch {
      binaryIsCurrent = false;
    }

    if (!binaryIsCurrent) {
      const sourcePath = `${AUDIO_CONTROL_BINARY_PATH}.swift`;
      await writeFile(sourcePath, SWIFT_AUDIO_CONTROL_CODE);
      try {
        await execFileAsync("xcrun", ["swiftc", "-O", "-o", AUDIO_CONTROL_BINARY_PATH, sourcePath]);
        await writeFile(AUDIO_CONTROL_VERSION_PATH, AUDIO_CONTROL_VERSION);
      } finally {
        try {
          await unlink(sourcePath);
        } catch {
          // Ignore cleanup failures for temporary source files.
        }
      }
    }

    return AUDIO_CONTROL_BINARY_PATH;
  })();

  try {
    return await ensureAudioControlBinaryPromise;
  } catch (error) {
    ensureAudioControlBinaryPromise = null;
    throw error;
  }
}

// Helper to run the swift script
async function runNativeAudioControl(args: string[] = []): Promise<string> {
  try {
    const binaryPath = await ensureAudioControlBinary();
    const { stdout } = await execFileAsync(binaryPath, args);
    return stdout;
  } catch {
    // Fallback interpreter path for environments where swiftc is unavailable.
    const scriptPath = join(tmpdir(), `AudioControl-${Date.now()}-${Math.random().toString(36).slice(2)}.swift`);
    try {
      await writeFile(scriptPath, SWIFT_AUDIO_CONTROL_CODE);
      const { stdout } = await execFileAsync("swift", [scriptPath, ...args]);
      return stdout;
    } catch {
      throw new Error("Native audio control failed");
    } finally {
      try {
        await unlink(scriptPath);
      } catch {
        // Ignore cleanup failures for temporary scripts.
      }
    }
  }
}

async function getActiveOutputBundleIds(): Promise<string[]> {
  const now = Date.now();
  if (activeOutputBundleIdsCache && activeOutputBundleIdsCache.expiresAt > now) {
    return activeOutputBundleIdsCache.value;
  }

  if (activeOutputBundleIdsPromise) {
    return activeOutputBundleIdsPromise;
  }

  activeOutputBundleIdsPromise = (async () => {
    try {
      const raw = await runNativeAudioControl(["--active-output-bundle-ids"]);
      const parsed = JSON.parse(raw) as string[];
      const unique = new Set(parsed.map((bundleId) => bundleId.trim()).filter((bundleId) => bundleId.length > 0));
      const value = Array.from(unique);
      activeOutputBundleIdsCache = {
        value,
        expiresAt: Date.now() + ACTIVE_OUTPUT_CACHE_TTL_MS,
      };
      return value;
    } catch (error) {
      console.error("Failed to read active output bundle IDs:", error);
      return [];
    } finally {
      activeOutputBundleIdsPromise = null;
    }
  })();

  return activeOutputBundleIdsPromise;
}

async function getActiveOutputBundleIdsFast(): Promise<string[]> {
  try {
    return await Promise.race<string[]>([
      getActiveOutputBundleIds(),
      new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([]), ACTIVE_OUTPUT_LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return [];
  }
}

// AppleScript execution helper
async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const osascript = spawn("osascript", ["-"]);
    let stdout = "";
    let stderr = "";

    osascript.stdin.write(script);
    osascript.stdin.end();

    osascript.stdout.on("data", (data) => {
      stdout += data;
    });

    osascript.stderr.on("data", (data) => {
      stderr += data;
    });

    osascript.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || "AppleScript failed"));
      }
    });

    osascript.on("error", (err) => {
      reject(err);
    });
  });
}

async function runJXAScript(script: string, timeoutMs = 1800): Promise<string> {
  return new Promise((resolve, reject) => {
    const osascript = spawn("osascript", ["-l", "JavaScript", "-"]);
    let stdout = "";
    let stderr = "";
    let didTimeout = false;

    const timeout = setTimeout(() => {
      didTimeout = true;
      osascript.kill("SIGTERM");
      reject(new Error("JXA script timed out"));
    }, timeoutMs);

    osascript.stdin.write(script);
    osascript.stdin.end();

    osascript.stdout.on("data", (data) => {
      stdout += data;
    });

    osascript.stderr.on("data", (data) => {
      stderr += data;
    });

    osascript.on("close", (code) => {
      clearTimeout(timeout);
      if (didTimeout) return;
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || "JXA script failed"));
      }
    });

    osascript.on("error", (err) => {
      clearTimeout(timeout);
      if (didTimeout) return;
      reject(err);
    });
  });
}

async function getRunningProcessesFromLsappinfo(): Promise<RunningProcessApp[]> {
  try {
    const { stdout } = await execFileAsync(LSAPPINFO_PATH, ["list"], { maxBuffer: 20 * 1024 * 1024 });
    const entries = stdout.split(/\n(?=\s*\d+\)\s+")/g);
    const byBundleId = new Map<string, RunningProcessApp>();

    for (const entry of entries) {
      const nameMatch = entry.match(/^\s*\d+\)\s+"([^"]+)"/m);
      const bundleIdMatch = entry.match(/bundleID="([^"]+)"/);
      if (!bundleIdMatch) continue;

      const bundleId = bundleIdMatch[1].trim();
      if (!bundleId) continue;

      const pathMatch = entry.match(/bundle path="([^"]+)"/);
      const typeMatch = entry.match(/\btype="([^"]+)"/);
      const type = typeMatch?.[1]?.trim().toLowerCase() ?? "";

      const process: RunningProcessApp = {
        name: nameMatch?.[1]?.trim() || bundleId,
        bundleId,
        path: pathMatch?.[1]?.trim() || "",
        background: type === "backgroundonly",
      };

      const existing = byBundleId.get(bundleId);
      if (!existing) {
        byBundleId.set(bundleId, process);
        continue;
      }

      const existingScore =
        (existing.background === false ? 2 : 0) + (existing.path && existing.path.includes(".app") ? 1 : 0);
      const nextScore =
        (process.background === false ? 2 : 0) + (process.path && process.path.includes(".app") ? 1 : 0);
      if (nextScore > existingScore) {
        byBundleId.set(bundleId, process);
      }
    }

    return Array.from(byBundleId.values());
  } catch {
    return [];
  }
}

async function getRunningProcessesFromJxa(): Promise<RunningProcessApp[]> {
  try {
    const raw = await runJXAScript(
      `
      const se = Application("System Events");
      const processes = se.processes();
      const output = [];

      for (const process of processes) {
        try {
          const bundleId = process.bundleIdentifier();
          if (!bundleId) continue;

          let background = false;
          try {
            background = process.backgroundOnly();
          } catch {
            background = false;
          }

          output.push({
            name: process.name() || "",
            bundleId: bundleId,
            path: "",
            background: background,
          });
        } catch {}
      }

      JSON.stringify(output);
    `,
      5000,
    );

    const parsed = JSON.parse(raw) as RunningProcessApp[];
    const uniqueByBundle = new Map<string, RunningProcessApp>();
    for (const process of parsed) {
      if (!process.bundleId) continue;
      if (!uniqueByBundle.has(process.bundleId)) {
        uniqueByBundle.set(process.bundleId, process);
      }
    }
    return Array.from(uniqueByBundle.values());
  } catch {
    return [];
  }
}

async function getRunningProcesses(): Promise<RunningProcessApp[]> {
  const now = Date.now();
  if (runningProcessesCache && runningProcessesCache.expiresAt > now) {
    return runningProcessesCache.value;
  }

  if (runningProcessesPromise) {
    return runningProcessesPromise;
  }

  runningProcessesPromise = (async () => {
    const fromLsappinfo = await getRunningProcessesFromLsappinfo();
    const value = fromLsappinfo.length > 0 ? fromLsappinfo : await getRunningProcessesFromJxa();
    runningProcessesCache = {
      value,
      expiresAt: Date.now() + RUNNING_PROCESSES_CACHE_TTL_MS,
    };
    return value;
  })();

  try {
    return await runningProcessesPromise;
  } finally {
    runningProcessesPromise = null;
  }
}

function getBundleRoot(bundleId: string): string {
  const lower = bundleId.toLowerCase();
  return lower.replace(/\.helper.*$/, "");
}

function isRelatedBundleId(targetBundleId: string, candidateBundleId: string): boolean {
  const targetRoot = getBundleRoot(targetBundleId);
  const candidateRoot = getBundleRoot(candidateBundleId);

  return (
    candidateBundleId === targetBundleId ||
    candidateBundleId.startsWith(`${targetRoot}.`) ||
    targetBundleId.startsWith(`${candidateRoot}.`) ||
    candidateRoot === targetRoot
  );
}

async function getRunningProcessBundleIds(): Promise<string[]> {
  const runningProcesses = await getRunningProcesses();
  return Array.from(new Set(runningProcesses.map((process) => process.bundleId).filter(Boolean)));
}

async function getRelatedRunningBundleIds(bundleId: string): Promise<string[]> {
  const allBundleIds = await getRunningProcessBundleIds();
  const related = allBundleIds.filter((candidate) => isRelatedBundleId(bundleId, candidate));
  if (!related.includes(bundleId)) {
    related.push(bundleId);
  }
  return Array.from(new Set(related));
}

function getRelatedSettingBundleIds(bundleId: string, ids: string[]): string[] {
  const related = ids.filter((candidate) => isRelatedBundleId(bundleId, candidate));
  if (!related.includes(bundleId)) {
    related.push(bundleId);
  }
  return Array.from(new Set(related));
}

// Get current system volume
export async function getSystemVolume(): Promise<VolumeInfo> {
  try {
    const result = await runAppleScript(`
      set settings to get volume settings
      return (output volume of settings as string) & "|" & (output muted of settings as string)
    `);
    const [volumeResult, mutedResult] = result.split("|");

    return {
      volume: parseInt(volumeResult) || 0,
      muted: mutedResult === "true",
    };
  } catch (error) {
    console.error("Failed to get system volume:", error);
    return { volume: 50, muted: false };
  }
}

// Set system volume (0-100)
export async function setSystemVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
  await runAppleScript(`set volume output volume ${clampedVolume}`);
}

// Toggle mute
export async function toggleMute(): Promise<boolean> {
  const { muted } = await getSystemVolume();
  const newMuted = !muted;
  await runAppleScript(`set volume output muted ${newMuted}`);
  return newMuted;
}

// Set mute state
export async function setMute(muted: boolean): Promise<void> {
  await runAppleScript(`set volume output muted ${muted}`);
}

// Get detailed audio devices using native Swift code
export async function getDetailedAudioDevices(): Promise<AudioDevice[]> {
  try {
    const json = await runNativeAudioControl();
    return JSON.parse(json);
  } catch (error) {
    console.error("Native audio control failed:", error);
    return [];
  }
}

async function getDefaultInputDeviceUid(): Promise<string | null> {
  try {
    const result = await runNativeAudioControl(["--get-default-input-uid"]);
    const uid = result.trim();
    return uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

async function setDefaultInputDevice(deviceUid: string): Promise<boolean> {
  try {
    const result = await runNativeAudioControl(["--set-input", deviceUid]);
    return result.trim() === "Success";
  } catch {
    return false;
  }
}

function getPairedBluetoothInputUid(outputUid: string): string | null {
  if (!outputUid.endsWith(":output")) return null;
  return outputUid.replace(/:output$/, ":input");
}

async function enforceBluetoothInputSafety(outputUid: string): Promise<void> {
  const pairedInputUid = getPairedBluetoothInputUid(outputUid);
  if (!pairedInputUid) return;

  const currentInputUid = await getDefaultInputDeviceUid();
  if (currentInputUid !== pairedInputUid) return;

  // Keep Bluetooth output in high-quality mode by moving input off headset mic.
  await setDefaultInputDevice("BuiltInMicrophoneDevice");
}

// Switch audio output device using native Swift code
export async function switchAudioDevice(deviceUid: string): Promise<boolean> {
  try {
    const result = await runNativeAudioControl(["--set-output", deviceUid]);
    const success = result.trim() === "Success";
    if (success) {
      await enforceBluetoothInputSafety(deviceUid);
    }
    return success;
  } catch (error) {
    console.error("Native switch failed:", error);
    return false;
  }
}

// Get currently running apps that might produce audio
export async function getRunningAudioApps(): Promise<AudioApp[]> {
  try {
    const [runningProcesses, activeOutputBundleIds] = await Promise.all([
      getRunningProcesses(),
      getActiveOutputBundleIdsFast(),
    ]);
    if (runningProcesses.length === 0) {
      return [];
    }

    const excludedBundleIds = new Set([
      "com.apple.finder",
      "com.raycast.macos",
      "com.openai.codex",
      "com.apple.dock",
      "com.apple.systempreferences",
      "com.finetuneapp.FineTune",
      "com.apple.controlcenter",
    ]);
    const excludedProcessNames = new Set(["raycast graphics and media"]);

    const knownAudioBundleIds = new Set([
      "com.spotify.client",
      "com.apple.Music",
      "com.apple.iTunes",
      "com.google.Chrome",
      "com.apple.Safari",
      "com.microsoft.edgemac",
      "com.brave.Browser",
      "company.thebrowser.Browser",
      "com.operasoftware.Opera",
      "com.operasoftware.OperaGX",
      "org.mozilla.firefox",
      "tv.plex.player",
      "com.colliderli.iina",
      "org.videolan.vlc",
      "com.apple.QuickTimePlayerX",
      "com.apple.podcasts",
      "com.tidal.desktop",
      "com.amazon.music",
      "com.netflix.Netflix",
      "com.disney.disneyplus",
      "com.hbo.hbonow",
      "com.plexamp.Plexamp",
      "com.microsoft.teams",
      "com.microsoft.teams2",
      "us.zoom.xos",
      "net.whatsapp.WhatsApp",
      "ru.keepcoder.Telegram",
      "com.slack.Slack",
      "com.hnc.Discord",
      "com.webex.meetingsapp",
      "com.skype.skype",
      "com.apple.FaceTime",
    ]);

    const audioKeywords = [
      "music",
      "audio",
      "video",
      "player",
      "podcast",
      "stream",
      "spotify",
      "youtube",
      "netflix",
      "chrome",
      "safari",
      "brave",
      "edge",
      "firefox",
      "opera",
      "teams",
      "zoom",
      "meet",
      "discord",
      "slack",
      "whatsapp",
      "telegram",
      "webex",
      "facetime",
      "vlc",
      "iina",
    ];

    const hasActiveOutput = (bundleId: string): boolean =>
      activeOutputBundleIds.some((activeBundleId) => isRelatedBundleId(bundleId, activeBundleId));

    const isLikelyAudioProcess = (process: RunningProcessApp): boolean => {
      const lowerName = process.name.toLowerCase();
      const lowerBundleId = process.bundleId.toLowerCase();

      return (
        knownAudioBundleIds.has(process.bundleId) ||
        audioKeywords.some((keyword) => lowerName.includes(keyword) || lowerBundleId.includes(keyword))
      );
    };

    const activeCandidates = runningProcesses.filter((process) => {
      if (!process.bundleId || excludedBundleIds.has(process.bundleId)) {
        return false;
      }
      if (excludedProcessNames.has(process.name.toLowerCase())) {
        return false;
      }

      return hasActiveOutput(process.bundleId);
    });

    const fallbackCandidates = runningProcesses.filter((process) => {
      if (!process.bundleId || excludedBundleIds.has(process.bundleId)) {
        return false;
      }
      if (excludedProcessNames.has(process.name.toLowerCase())) {
        return false;
      }
      if (process.background) {
        return false;
      }
      return isLikelyAudioProcess(process);
    });

    const pickScore = (process: RunningProcessApp): number => {
      const lowerName = process.name.toLowerCase();
      const lowerBundleId = process.bundleId.toLowerCase();
      const technicalName =
        /helper|renderer|gpu|notification|modulehost|app_mode_loader|crashpad|plugin|updater|service/.test(lowerName);
      const technicalBundle =
        /helper|renderer|gpu|notification|modulehost|app_mode_loader|crashpad|plugin|updater|service/.test(
          lowerBundleId,
        );

      let score = 0;
      if (hasActiveOutput(process.bundleId)) score += 10;
      if (process.background === false) score += 4;
      if (process.path && process.path.includes(".app")) score += 2;
      if (!technicalName) score += 2;
      if (!technicalBundle) score += 1;
      return score;
    };

    const getNameFromPath = (path: string): string | null => {
      const match = path.match(/\/([^/]+)\.app(?:\/|$)/);
      if (!match) return null;
      const name = match[1]?.trim();
      return name && name.length > 0 ? name : null;
    };

    const selected: RunningProcessApp[] = [];
    const mergedCandidates = [...activeCandidates, ...fallbackCandidates];
    for (const process of mergedCandidates) {
      const existingIndex = selected.findIndex((candidate) => isRelatedBundleId(candidate.bundleId, process.bundleId));
      if (existingIndex === -1) {
        selected.push(process);
        continue;
      }

      if (pickScore(process) > pickScore(selected[existingIndex])) {
        selected[existingIndex] = process;
      }
    }

    const audioApps: AudioApp[] = selected.map((process) => {
      const fallbackName = process.name || process.bundleId;
      const appName = getNameFromPath(process.path) ?? fallbackName;
      return {
        name: appName,
        bundleId: process.bundleId,
        path: process.path || `/Applications/${appName}.app`,
        isRunning: true,
        activeOutputDetected: hasActiveOutput(process.bundleId),
      };
    });

    return audioApps.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get running audio apps:", error);
    return [];
  }
}

// Constants for browser detection
const CHROMIUM_BROWSERS = ["google chrome", "chrome", "brave", "arc", "microsoft edge", "edge", "opera", "vivaldi"];
const FIREFOX_BROWSERS = ["firefox", "zen", "floorp", "librewolf"];
const COMMUNICATION_BUNDLE_IDS = new Set([
  "com.microsoft.teams",
  "com.microsoft.teams2",
  "us.zoom.xos",
  "com.slack.Slack",
  "com.hnc.Discord",
  "net.whatsapp.WhatsApp",
  "ru.keepcoder.Telegram",
  "com.apple.FaceTime",
  "com.webex.meetingsapp",
  "com.skype.skype",
]);
const COMMUNICATION_NAME_KEYWORDS = ["teams", "zoom", "meet", "meeting", "call", "webex", "facetime", "discord"];

function isChromium(name: string): boolean {
  const lower = name.toLowerCase();
  return CHROMIUM_BROWSERS.some((b) => lower.includes(b));
}

function isFirefox(name: string): boolean {
  const lower = name.toLowerCase();
  return FIREFOX_BROWSERS.some((b) => lower.includes(b));
}

export function isCommunicationApp(appName: string, bundleId?: string): boolean {
  const lowerName = appName.toLowerCase();
  const lowerBundleId = bundleId?.toLowerCase() ?? "";

  return (
    (bundleId ? COMMUNICATION_BUNDLE_IDS.has(bundleId) : false) ||
    COMMUNICATION_NAME_KEYWORDS.some((keyword) => lowerName.includes(keyword)) ||
    COMMUNICATION_NAME_KEYWORDS.some((keyword) => lowerBundleId.includes(keyword))
  );
}

// Get application status (volume + state)
export async function getAppStatus(appName: string, bundleId?: string): Promise<AppStatus> {
  const lowerName = appName.toLowerCase();
  let script = "";

  if (isCommunicationApp(appName, bundleId)) {
    const stored = bundleId ? await getFineTuneStoredVolume(bundleId) : null;
    return {
      volume: stored !== null ? Math.round(stored * 100) : null,
      // Do not force "playing" for communication apps.
      // Teams/WhatsApp don't expose a reliable media-state API via AppleScript/JXA.
      state: "unknown",
    };
  }

  if (isChromium(appName)) {
    // Return "vol|state" by scanning all tabs, not only the active one.
    const js = `(function() {
      try {
        var playbackState = (navigator.mediaSession && navigator.mediaSession.playbackState) ? String(navigator.mediaSession.playbackState) : "";
        var media = document.querySelectorAll("video, audio");
        var anyMedia = media.length > 0;
        var anyPlaying = false;
        var vol = -1;

        for (var i = 0; i < media.length; i++) {
          var el = media[i];
          var elVol = Math.round((typeof el.volume === "number" ? el.volume : 1) * 100);
          if (elVol > vol) vol = elVol;
          if (!el.paused && !el.ended) anyPlaying = true;
        }

        if (playbackState === "playing" || anyPlaying) {
          if (vol < 0) vol = 100;
          return vol + "|playing";
        }

        if (playbackState === "paused" || anyMedia) {
          if (vol < 0) vol = 100;
          return vol + "|paused";
        }

        return "-1|stopped";
      } catch (e) {
        return "-1|unknown";
      }
    })();`;
    const jsEscaped = js.replace(/"/g, '\\"');
    script = `
      try
        set fallbackResult to ""
        tell application "${appName}"
          repeat with w in windows
            repeat with t in tabs of w
              try
                set tabResult to execute t javascript "${jsEscaped}"
                if tabResult contains "|playing" then
                  return tabResult
                end if

                if tabResult is not "-1|stopped" and fallbackResult is "" then
                  set fallbackResult to tabResult
                end if
              end try
            end repeat
          end repeat
        end tell
        if fallbackResult is not "" then
          return fallbackResult
        end if
        return "-1|stopped"
      on error
        return "-1|unknown"
      end try
    `;
  } else if (lowerName === "safari") {
    const js = `(function() {
      try {
        var playbackState = (navigator.mediaSession && navigator.mediaSession.playbackState) ? String(navigator.mediaSession.playbackState) : "";
        var media = document.querySelectorAll("video, audio");
        var anyMedia = media.length > 0;
        var anyPlaying = false;
        var vol = -1;

        for (var i = 0; i < media.length; i++) {
          var el = media[i];
          var elVol = Math.round((typeof el.volume === "number" ? el.volume : 1) * 100);
          if (elVol > vol) vol = elVol;
          if (!el.paused && !el.ended) anyPlaying = true;
        }

        if (playbackState === "playing" || anyPlaying) {
          if (vol < 0) vol = 100;
          return vol + "|playing";
        }

        if (playbackState === "paused" || anyMedia) {
          if (vol < 0) vol = 100;
          return vol + "|paused";
        }

        return "-1|stopped";
      } catch (e) {
        return "-1|unknown";
      }
    })();`;
    const jsEscaped = js.replace(/"/g, '\\"');
    script = `
      try
        set fallbackResult to ""
        tell application "${appName}"
          repeat with w in windows
            repeat with t in tabs of w
              try
                set tabResult to do JavaScript "${jsEscaped}" in t
                if tabResult contains "|playing" then
                  return tabResult
                end if

                if tabResult is not "-1|stopped" and fallbackResult is "" then
                  set fallbackResult to tabResult
                end if
              end try
            end repeat
          end repeat
        end tell
        if fallbackResult is not "" then
          return fallbackResult
        end if
        return "-1|stopped"
      on error
        return "-1|unknown"
      end try
    `;
  } else if (["music", "spotify", "tv", "apple music"].includes(lowerName)) {
    // Prefer JXA for better compatibility with modern Spotify/Music builds.
    try {
      const jxaResult = await runJXAScript(`
        try {
          const app = Application(${JSON.stringify(appName)});
          let v = -1;
          let s = "unknown";
          try { v = Number(app.soundVolume()); } catch (e) {}
          try { s = String(app.playerState()).toLowerCase(); } catch (e) {}
          if (!Number.isFinite(v)) v = -1;
          console.log(Math.round(v) + "|" + s);
        } catch (e) {
          console.log("-1|unknown");
        }
      `);

      const jxaParts = jxaResult.trim().split("|");
      const jxaVol = parseFloat(jxaParts[0]);
      const jxaState = jxaParts[1]?.toLowerCase();

      return {
        volume: !Number.isNaN(jxaVol) && jxaVol >= 0 ? Math.round(jxaVol) : null,
        state:
          jxaState === "playing"
            ? "playing"
            : jxaState === "paused"
              ? "paused"
              : jxaState === "stopped"
                ? "stopped"
                : "unknown",
      };
    } catch {
      script = `
        try
          tell application "${appName}"
            set v to sound volume
            set s to player state as string
            return (v as string) & "|" & s
          end tell
        on error
          return "-1|unknown"
        end try
      `;
    }
  } else if (lowerName === "vlc") {
    // VLC 'audio volume' and 'playing'
    script = `
      try
        tell application "${appName}"
          set v to get audio volume
          if (playing) then
            set s to "playing"
          else
            set s to "paused"
          end if
          return (v as string) & "|" & s
        end tell
      on error
        return "-1|unknown"
      end try
    `;
  } else if (isFirefox(appName)) {
    return { volume: null, state: "unknown" };
  } else {
    // Generic fallback
    script = `
      try
        tell application "${appName}"
          set v to get sound volume
          return (v as string) & "|unknown"
        end tell
      on error
        return "-1|unknown"
      end try
    `;
  }

  try {
    const result = await runAppleScript(script);
    const parts = result.trim().split("|");
    const volStr = parts[0];
    const stateStr = parts[1]?.toLowerCase();

    let volume: number | null = parseFloat(volStr);
    if (isNaN(volume) || volume === -1) volume = null;

    // Normalization
    if (volume !== null) {
      if (isChromium(appName) || lowerName === "safari") {
        volume = Math.round(volume); // Already 0-100
      } else if (lowerName === "vlc") {
        volume = Math.round(volume / 2.56);
      } else {
        volume = Math.round(volume);
      }
    }

    let state: AppStatus["state"] = "unknown";
    if (stateStr === "playing") state = "playing";
    else if (stateStr === "paused") state = "paused";
    else if (stateStr === "stopped") state = "stopped";

    return { volume, state };
  } catch {
    return { volume: null, state: "unknown" };
  }
}

// Set application volume (0-200) for supported apps
// Returns: "true" (success), or error string starting with "error:"
export async function setAppVolume(appName: string, volume: number, bundleId?: string): Promise<string> {
  const clampedVolume = Math.max(0, Math.min(200, Math.round(volume)));
  const lowerName = appName.toLowerCase();
  const communicationApp = isCommunicationApp(appName, bundleId);
  const safeFineTuneVolume = (communicationApp ? Math.min(clampedVolume, 100) : clampedVolume) / 100;
  const boostRequested = clampedVolume > 100;
  let fineTuneBoostApplied = false;

  // Communication apps are sensitive while in calls. Prefer FineTune hot update without restarting audio engine.
  if (bundleId && communicationApp) {
    const updated = await setFineTuneAppVolume(bundleId, safeFineTuneVolume);
    if (updated) return "true";
  }

  // For >100 on non-communication apps, use FineTune's gain path when available.
  // Keep app-level volume at 100 to avoid clamping/stacking inconsistencies.
  if (bundleId && !communicationApp && boostRequested) {
    fineTuneBoostApplied = await setFineTuneAppVolume(bundleId, safeFineTuneVolume, { restartFineTune: true });
  } else if (bundleId && !communicationApp && clampedVolume <= 100) {
    // Clear residual boost when user returns to <=100.
    const currentStored = await getFineTuneStoredVolume(bundleId);
    const restartToClearBoost = currentStored !== null && currentStored > 1.001;
    await setFineTuneAppVolume(bundleId, clampedVolume / 100, { restartFineTune: restartToClearBoost });
  }

  const scriptVolume = fineTuneBoostApplied && boostRequested ? 100 : clampedVolume;
  const volFraction = scriptVolume / 100;

  // JavaScript to inject for browsers to control HTML5 media
  // Uses Web Audio API GainNode for boosting > 100%
  // We use simpler property names to save space and reduce escaping complexity
  const browserJs = `
    (function() {
        var t = ${volFraction};
        var elems = document.querySelectorAll("video, audio");
        for (var i = 0; i < elems.length; i++) {
            var e = elems[i];
            try {
                if (!e._rb) {
                    e._rb = { ctx: null, src: null, gain: null };
                }
                var rb = e._rb;

                // Boost path (WebAudio required)
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) {
                    e.volume = (t > 1) ? 1 : t;
                    continue;
                }
                if (!rb.ctx) {
                    rb.ctx = new AC();
                    rb.src = rb.ctx.createMediaElementSource(e);
                    rb.gain = rb.ctx.createGain();
                    rb.src.connect(rb.gain);
                    rb.gain.connect(rb.ctx.destination);
                }

                e.volume = 1;

                if (rb.ctx.state === "suspended") {
                    try { rb.ctx.resume(); } catch (err) {}
                }

                if (rb.ctx.state === "running") {
                    // Route through GainNode: 1.0 = 100%, >1.0 = boost.
                    e.volume = 1;
                    rb.gain.gain.value = Math.max(0, t);
                } else {
                    // If WebAudio isn't running yet, fall back to native (max 100%).
                    e.volume = (t > 1) ? 1 : t;
                }
            } catch (err) {
                console.error("Raycast Boost Error:", err);
                e.volume = (t > 1) ? 1 : t;
            }
        }
    })();
  `;

  // Use JSON.stringify to safely escape the JS string for AppleScript
  // Slice(1, -1) removes the surrounding quotes added by stringify
  const jsEscaped = JSON.stringify(browserJs).slice(1, -1);

  let script = "";

  // 1. Chromium Browsers
  if (isChromium(appName)) {
    script = `
      try
        tell application "${appName}"
          execute front window's active tab javascript "${jsEscaped}"
        end tell
        return "true"
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }
  // 2. Safari
  else if (lowerName === "safari") {
    script = `
      try
        tell application "${appName}"
          if (count of windows) > 0 then
            do JavaScript "${jsEscaped}" in current tab of front window
            return "true"
          else
            error "No open websites found"
          end if
        end tell
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }
  // 3. IINA
  else if (lowerName === "iina") {
    script = `
      try
        tell application "${appName}"
          set volume to ${scriptVolume}
        end tell
        return "true"
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }
  // 4. VLC
  else if (lowerName === "vlc") {
    script = `
      try
        tell application "${appName}"
          set audio volume to ${scriptVolume * 4}
        end tell
        return "true"
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }
  // 5. Firefox / Zen (Not supported)
  else if (isFirefox(appName)) {
    return "error: Firefox-based browsers do not support AppleScript volume control";
  }
  // 6. Music / Spotify / TV (Standard Audio Apps)
  else if (["music", "spotify", "tv", "apple music"].includes(lowerName)) {
    script = `
      try
        run script "tell application \\"${appName}\\" to set sound volume to ${scriptVolume}"
        return "true"
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }
  // 7. Standard / Generic Fallback
  else {
    script = `
      try
        tell application "${appName}"
          try
            set sound volume to ${scriptVolume}
            return "true"
          on error
            try
              set audio volume to ${volFraction}
              return "true"
            on error
              set volume to ${scriptVolume}
              return "true"
            end try
          end try
        end tell
      on error errMsg
        return "error: " & errMsg
      end try
    `;
  }

  try {
    const result = await runAppleScript(script);
    if (result === "true") {
      return "true";
    }

    // Fallback for non-scriptable apps: write FineTune per-app volume directly.
    if (bundleId) {
      const updated = await setFineTuneAppVolume(bundleId, safeFineTuneVolume, {
        restartFineTune: boostRequested,
      });
      if (updated) {
        return "true";
      }
    }

    return result;
  } catch (e: unknown) {
    if (bundleId) {
      const updated = await setFineTuneAppVolume(bundleId, safeFineTuneVolume, {
        restartFineTune: boostRequested,
      });
      if (updated) {
        return "true";
      }
    }

    const msg = e instanceof Error ? e.message : String(e);
    return "error: " + msg;
  }
}

async function isFineTuneInstalled(): Promise<boolean> {
  const now = Date.now();
  if (fineTuneInstalledCache && fineTuneInstalledCache.expiresAt > now) {
    return fineTuneInstalledCache.value;
  }

  if (fineTuneInstalledPromise) {
    return fineTuneInstalledPromise;
  }

  fineTuneInstalledPromise = (async () => {
    try {
      await access(FINETUNE_APP_PATH);
      fineTuneInstalledCache = {
        value: true,
        expiresAt: Date.now() + FINETUNE_INSTALL_CACHE_TTL_MS,
      };
      return true;
    } catch {
      fineTuneInstalledCache = {
        value: false,
        expiresAt: Date.now() + FINETUNE_INSTALL_CACHE_TTL_MS,
      };
      return false;
    } finally {
      fineTuneInstalledPromise = null;
    }
  })();

  return fineTuneInstalledPromise;
}

function createDefaultFineTuneSettings(): FineTuneSettings {
  return {
    appDeviceRouting: {},
    appMutes: {},
    appEQSettings: {},
    appVolumes: {},
    version: 4,
  };
}

function normalizeFineTuneSettings(parsed: Partial<FineTuneSettings>): FineTuneSettings {
  return {
    appDeviceRouting: parsed.appDeviceRouting ?? {},
    appMutes: parsed.appMutes ?? {},
    appEQSettings: parsed.appEQSettings ?? {},
    appVolumes: parsed.appVolumes ?? {},
    version: parsed.version ?? 4,
  };
}

function cloneFineTuneSettings(settings: FineTuneSettings): FineTuneSettings {
  return {
    appDeviceRouting: { ...settings.appDeviceRouting },
    appMutes: { ...settings.appMutes },
    appEQSettings: { ...settings.appEQSettings },
    appVolumes: { ...settings.appVolumes },
    version: settings.version,
  };
}

async function isFineTuneToggleEnabledByUser(): Promise<boolean> {
  const state = await LocalStorage.getItem<string>(FINETUNE_TOGGLE_STATE_KEY);
  return state !== "off";
}

async function setFineTuneToggleState(enabled: boolean): Promise<void> {
  await LocalStorage.setItem(FINETUNE_TOGGLE_STATE_KEY, enabled ? "on" : "off");
}

async function saveFineTuneSettingsBackup(settings: FineTuneSettings): Promise<void> {
  const payload: FineTuneSettingsBackupPayload = {
    savedAt: Date.now(),
    settings: cloneFineTuneSettings(settings),
  };
  await LocalStorage.setItem(FINETUNE_TOGGLE_BACKUP_KEY, JSON.stringify(payload));
}

async function loadFineTuneSettingsBackup(): Promise<FineTuneSettings | null> {
  try {
    const raw = await LocalStorage.getItem<string>(FINETUNE_TOGGLE_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FineTuneSettingsBackupPayload>;
    if (!parsed?.settings) return null;
    return normalizeFineTuneSettings(parsed.settings);
  } catch {
    return null;
  }
}

async function readFineTuneSettings(options?: { forceFresh?: boolean }): Promise<FineTuneSettings> {
  const forceFresh = options?.forceFresh === true;
  const now = Date.now();

  if (!forceFresh && fineTuneSettingsCache && fineTuneSettingsCache.expiresAt > now) {
    return cloneFineTuneSettings(fineTuneSettingsCache.value);
  }

  if (!forceFresh && fineTuneSettingsPromise) {
    const inFlight = await fineTuneSettingsPromise;
    return cloneFineTuneSettings(inFlight);
  }

  const loadPromise = (async (): Promise<FineTuneSettings> => {
    try {
      const raw = await readFile(FINETUNE_SETTINGS_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<FineTuneSettings>;
      return normalizeFineTuneSettings(parsed);
    } catch {
      await mkdir(FINETUNE_SETTINGS_DIR, { recursive: true });
      return createDefaultFineTuneSettings();
    }
  })();

  if (!forceFresh) {
    fineTuneSettingsPromise = loadPromise;
  }

  try {
    const settings = await loadPromise;
    fineTuneSettingsCache = {
      value: cloneFineTuneSettings(settings),
      expiresAt: Date.now() + FINETUNE_SETTINGS_CACHE_TTL_MS,
    };
    return cloneFineTuneSettings(settings);
  } finally {
    if (!forceFresh) {
      fineTuneSettingsPromise = null;
    }
  }
}

async function writeFineTuneSettings(settings: FineTuneSettings): Promise<void> {
  await mkdir(FINETUNE_SETTINGS_DIR, { recursive: true });
  const tempPath = `${FINETUNE_SETTINGS_PATH}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(settings));
  await rename(tempPath, FINETUNE_SETTINGS_PATH);
  fineTuneInstalledCache = {
    value: true,
    expiresAt: Date.now() + FINETUNE_INSTALL_CACHE_TTL_MS,
  };
  fineTuneSettingsCache = {
    value: cloneFineTuneSettings(settings),
    expiresAt: Date.now() + FINETUNE_SETTINGS_CACHE_TTL_MS,
  };
  fineTuneSettingsPromise = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isFineTuneRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript('tell application "System Events" to (name of processes) contains "FineTune"');
    return result.trim() === "true";
  } catch {
    return false;
  }
}

async function stopFineTune(): Promise<void> {
  try {
    await runAppleScript('tell application "FineTune" to quit');
  } catch {
    // FineTune may not be running yet.
  }

  for (let i = 0; i < 30; i++) {
    if (!(await isFineTuneRunning())) return;
    await sleep(100);
  }
}

async function startFineTune(): Promise<void> {
  await execAsync(`open -ga "${FINETUNE_APP_PATH}"`);
}

async function canUseFineTuneFeatures(): Promise<boolean> {
  if (!(await isFineTuneToggleEnabledByUser())) return false;
  return isFineTuneInstalled();
}

export async function isFineTuneAvailable(): Promise<boolean> {
  return isFineTuneInstalled();
}

export async function isFineTuneEnabled(): Promise<boolean> {
  return isFineTuneToggleEnabledByUser();
}

export async function setFineTuneEnabled(enabled: boolean): Promise<boolean> {
  try {
    if (!(await isFineTuneInstalled())) return false;

    if (enabled) {
      const backup = await loadFineTuneSettingsBackup();
      await stopFineTune();

      if (backup) {
        await writeFineTuneSettings(backup);
      }

      await startFineTune();
      await setFineTuneToggleState(true);
      return true;
    }

    const current = await readFineTuneSettings({ forceFresh: true });
    await saveFineTuneSettingsBackup(current);

    const neutral = cloneFineTuneSettings(current);
    neutral.appDeviceRouting = {};
    neutral.appVolumes = {};
    neutral.appMutes = {};

    await stopFineTune();
    await writeFineTuneSettings(neutral);
    await setFineTuneToggleState(false);
    return true;
  } catch {
    return false;
  }
}

export async function toggleFineTuneEnabled(): Promise<boolean | null> {
  const currentlyEnabled = await isFineTuneToggleEnabledByUser();
  const nextEnabled = !currentlyEnabled;
  const success = await setFineTuneEnabled(nextEnabled);
  if (!success) return null;
  return nextEnabled;
}

async function updateFineTuneSettings(
  mutator: (settings: FineTuneSettings) => void,
  options?: { restartFineTune?: boolean },
): Promise<boolean> {
  const restartFineTune = options?.restartFineTune ?? true;

  try {
    if (!(await isFineTuneInstalled())) return false;
    if (restartFineTune) {
      await stopFineTune();
    }

    const settings = await readFineTuneSettings({ forceFresh: true });
    mutator(settings);
    await writeFineTuneSettings(settings);

    if (restartFineTune) {
      await startFineTune();
    }

    return true;
  } catch {
    if (restartFineTune) {
      try {
        await startFineTune();
      } catch {
        // Ignore recovery failures.
      }
    }

    return false;
  }
}

async function getFineTuneStoredVolume(bundleId: string): Promise<number | null> {
  try {
    if (!(await canUseFineTuneFeatures())) return null;
    const settings = await readFineTuneSettings();
    const direct = settings.appVolumes[bundleId];
    if (typeof direct === "number") return direct;

    for (const [candidateBundleId, value] of Object.entries(settings.appVolumes)) {
      if (typeof value === "number" && isRelatedBundleId(bundleId, candidateBundleId)) {
        return value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function setFineTuneAppVolume(
  bundleId: string,
  normalizedVolume: number,
  options?: { restartFineTune?: boolean },
): Promise<boolean> {
  if (!(await canUseFineTuneFeatures())) return false;
  const target = Math.max(0, Math.min(2, normalizedVolume));
  const targetBundleIds = await getRelatedRunningBundleIds(bundleId);
  const restartFineTune = options?.restartFineTune ?? false;

  const current = await getFineTuneStoredVolume(bundleId);
  if (current !== null && Math.abs(current - target) < 0.001 && targetBundleIds.length <= 1) {
    return true;
  }

  return updateFineTuneSettings(
    (settings) => {
      for (const id of targetBundleIds) {
        settings.appVolumes[id] = target;
      }
    },
    { restartFineTune },
  );
}

export async function getAppOutputDevice(bundleId: string): Promise<string | null> {
  const routes = await getAppOutputDevices([bundleId]);
  return routes[bundleId] ?? null;
}

export async function getAppOutputDevices(bundleIds: string[]): Promise<Record<string, string | null>> {
  const uniqueBundleIds = Array.from(new Set(bundleIds.filter((bundleId) => bundleId.trim().length > 0)));
  const output: Record<string, string | null> = {};

  for (const bundleId of uniqueBundleIds) {
    output[bundleId] = null;
  }

  if (uniqueBundleIds.length === 0) {
    return output;
  }

  try {
    if (!(await canUseFineTuneFeatures())) return output;
    const settings = await readFineTuneSettings();
    const routingEntries = Object.entries(settings.appDeviceRouting);

    for (const bundleId of uniqueBundleIds) {
      const direct = settings.appDeviceRouting[bundleId];
      if (direct) {
        output[bundleId] = direct;
        continue;
      }

      for (const [candidateBundleId, deviceUid] of routingEntries) {
        if (isRelatedBundleId(bundleId, candidateBundleId)) {
          output[bundleId] = deviceUid;
          break;
        }
      }
    }

    return output;
  } catch {
    return output;
  }
}

// Configure application output device through FineTune's routing settings.
export async function setAppOutputDevice(bundleId: string, deviceUid: string): Promise<boolean> {
  try {
    if (!(await canUseFineTuneFeatures())) return false;
    const runningRelated = await getRelatedRunningBundleIds(bundleId);
    const success = await updateFineTuneSettings((settings) => {
      const related = getRelatedSettingBundleIds(bundleId, [
        ...runningRelated,
        ...Object.keys(settings.appDeviceRouting),
        ...Object.keys(settings.appVolumes),
      ]);

      for (const id of related) {
        settings.appDeviceRouting[id] = deviceUid;
      }
    });
    if (!success) return false;
    await enforceBluetoothInputSafety(deviceUid);
    return true;
  } catch {
    return false;
  }
}

export async function removeAppOutputDevice(bundleId: string): Promise<boolean> {
  if (!(await canUseFineTuneFeatures())) return false;
  return updateFineTuneSettings((settings) => {
    const related = getRelatedSettingBundleIds(bundleId, [
      ...Object.keys(settings.appDeviceRouting),
      ...Object.keys(settings.appVolumes),
    ]);

    for (const id of related) {
      delete settings.appDeviceRouting[id];
    }
  });
}

export async function resetControlAppVolumeSettings(): Promise<boolean> {
  if (!(await isFineTuneInstalled())) {
    return true;
  }

  if (!(await canUseFineTuneFeatures())) {
    return true;
  }

  return updateFineTuneSettings((settings) => {
    settings.appDeviceRouting = {};
    settings.appVolumes = {};
  });
}

// Volume presets
export const VOLUME_PRESETS = [
  { name: "Mute", value: 0, icon: Icon.SpeakerOff },
  { name: "Low", value: 25, icon: Icon.SpeakerLow },
  { name: "Medium", value: 50, icon: Icon.SpeakerOn },
  { name: "High", value: 75, icon: Icon.SpeakerHigh },
  { name: "Maximum", value: 100, icon: Icon.SpeakerHigh },
  { name: "Boost 150%", value: 150, icon: Icon.SpeakerHigh },
  { name: "Boost 200%", value: 200, icon: Icon.SpeakerHigh },
];

// EQ Presets (matching FineTune's presets)
export const EQ_PRESETS = {
  Flat: { name: "Flat", description: "No EQ adjustments" },
  Bass: { name: "Bass Boost", description: "Enhanced low frequencies" },
  Treble: { name: "Treble Boost", description: "Enhanced high frequencies" },
  Vocal: { name: "Vocal", description: "Enhanced mid-range for vocals" },
  Electronic: { name: "Electronic", description: "Optimized for electronic music" },
  Classical: { name: "Classical", description: "Balanced for orchestral music" },
  Rock: { name: "Rock", description: "Enhanced bass and treble" },
  Jazz: { name: "Jazz", description: "Warm sound with enhanced mids" },
  Pop: { name: "Pop", description: "Bright and punchy" },
  HipHop: { name: "Hip Hop", description: "Heavy bass emphasis" },
  Podcast: { name: "Podcast", description: "Clear speech optimization" },
  Movie: { name: "Movie", description: "Cinematic sound profile" },
  Gaming: { name: "Gaming", description: "Enhanced spatial audio" },
  Acoustic: { name: "Acoustic", description: "Natural instrument sound" },
  RnB: { name: "R&B", description: "Smooth bass and vocals" },
  Country: { name: "Country", description: "Guitar and vocal focus" },
  Dance: { name: "Dance", description: "Energetic bass and highs" },
  Metal: { name: "Metal", description: "Aggressive sound profile" },
  Latin: { name: "Latin", description: "Rhythmic enhancement" },
  Lounge: { name: "Lounge", description: "Relaxed ambient sound" },
};
