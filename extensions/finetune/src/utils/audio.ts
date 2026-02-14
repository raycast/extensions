import { exec, spawn } from "child_process";
import { promisify } from "util";
import { getApplications, Icon } from "@raycast/api";
import { access, mkdir, readFile, rename, writeFile, unlink } from "fs/promises";
import { dirname, join } from "path";
import { homedir, tmpdir } from "os";

const execAsync = promisify(exec);
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
}

export interface AppStatus {
  volume: number | null;
  state: "playing" | "paused" | "stopped" | "unknown";
}

export interface VolumeInfo {
  volume: number; // 0-100
  muted: boolean;
}

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
    if command == "--get-default-input-uid" {
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

// Helper to run the swift script
async function runNativeAudioControl(args: string[] = []): Promise<string> {
  const scriptPath = join(tmpdir(), `AudioControl-${Date.now()}.swift`);
  try {
    await writeFile(scriptPath, SWIFT_AUDIO_CONTROL_CODE);
    const { stdout } = await execAsync(`swift "${scriptPath}" ${args.map((a) => `"${a}"`).join(" ")}`);
    return stdout;
  } finally {
    try {
      await unlink(scriptPath);
    } catch {
      // Ignore cleanup failures for temporary scripts.
    }
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

// Get current system volume
export async function getSystemVolume(): Promise<VolumeInfo> {
  try {
    const volumeScript = "output volume of (get volume settings)";
    const mutedScript = "output muted of (get volume settings)";

    const [volumeResult, mutedResult] = await Promise.all([runAppleScript(volumeScript), runAppleScript(mutedScript)]);

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
    const allApps = await getApplications();

    // Use System Events to get running Bundle IDs (Robust Method)
    // This replaces the fragile 'ps' parsing which can fail on path mismatches
    const runningBundleIdsString = await runAppleScript(
      'tell application "System Events" to get bundle identifier of every process where background only is false',
    );

    // Normalize IDs (handling potential "missing value" or empty strings)
    const runningBundleIds = new Set(
      runningBundleIdsString
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id && id !== "missing value"),
    );

    // Common audio-producing apps to highlight
    const audioAppBundleIds = [
      "com.spotify.client",
      "com.apple.Music",
      "com.apple.iTunes",
      "com.google.Chrome",
      "org.mozilla.firefox",
      "com.apple.Safari",
      "com.microsoft.edgemac",
      "com.brave.Browser",
      "us.zoom.xos",
      "com.microsoft.teams",
      "com.slack.Slack",
      "com.hnc.Discord",
      "com.valvesoftware.steam",
      "com.apple.FaceTime",
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
    ];

    const audioApps: AudioApp[] = [];

    for (const app of allApps) {
      if (!app.bundleId) continue;

      // Check if running using the robust Bundle ID set
      if (runningBundleIds.has(app.bundleId)) {
        const isMedia =
          audioAppBundleIds.includes(app.bundleId) ||
          app.name.toLowerCase().includes("music") ||
          app.name.toLowerCase().includes("spotify") ||
          app.name.toLowerCase().includes("player") ||
          app.bundleId.includes("browser") ||
          app.bundleId.includes("chrome") ||
          app.bundleId.includes("firefox") ||
          app.bundleId.includes("safari");

        if (isMedia && !audioApps.find((a) => a.bundleId === app.bundleId)) {
          audioApps.push({
            name: app.name,
            bundleId: app.bundleId,
            path: app.path,
            isRunning: true,
          });
        }
      }
    }

    return audioApps;
  } catch (error) {
    console.error("Failed to get running audio apps:", error);
    return [];
  }
}

// Constants for browser detection
const CHROMIUM_BROWSERS = ["google chrome", "chrome", "brave", "arc", "microsoft edge", "edge", "opera", "vivaldi"];
const FIREFOX_BROWSERS = ["firefox", "zen", "floorp", "librewolf"];

function isChromium(name: string): boolean {
  const lower = name.toLowerCase();
  return CHROMIUM_BROWSERS.some((b) => lower.includes(b));
}

function isFirefox(name: string): boolean {
  const lower = name.toLowerCase();
  return FIREFOX_BROWSERS.some((b) => lower.includes(b));
}

// Get application status (volume + state)
export async function getAppStatus(appName: string): Promise<AppStatus> {
  const lowerName = appName.toLowerCase();
  let script = "";

  if (isChromium(appName)) {
    // Return "vol|state"
    const js = `(function() { 
      var media = document.querySelectorAll('video, audio'); 
      if (media.length === 0) return "-1|stopped";
      var el = media[0];
      var vol = Math.round(el.volume * 100);
      var state = el.paused ? "paused" : "playing";
      return vol + "|" + state; 
    })();`;
    const jsEscaped = js.replace(/"/g, '\\"');
    script = `
      try
        tell application "${appName}"
          execute front window's active tab javascript "${jsEscaped}"
        end tell
      on error
        return "-1|unknown"
      end try
    `;
  } else if (lowerName === "safari") {
    const js = `(function() { 
      var media = document.querySelectorAll('video, audio'); 
      if (media.length === 0) return "-1|stopped";
      var el = media[0];
      var vol = Math.round(el.volume * 100);
      var state = el.paused ? "paused" : "playing";
      return vol + "|" + state; 
    })();`;
    const jsEscaped = js.replace(/"/g, '\\"');
    script = `
      try
        tell application "${appName}"
          if (count of windows) > 0 then
            set statusResult to do JavaScript "${jsEscaped}" in current tab of front window
            return statusResult
          else
            return "-1|stopped"
          end if
        end tell
      on error
        return "-1|unknown"
      end try
    `;
  } else if (["music", "spotify", "tv", "apple music"].includes(lowerName)) {
    // Music/Spotify usually have 'player state' (playing, paused, stopped)
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
  const volFraction = clampedVolume / 100;

  if (bundleId && clampedVolume > 100) {
    const boosted = await setFineTuneBoostVolume(bundleId, volFraction);
    if (boosted) return "true";
  }

  if (bundleId && clampedVolume <= 100) {
    await clearFineTuneBoostVolume(bundleId);
  }

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
                    e._rb = { ctx: null, src: null, gain: null, boosting: false, prevMuted: null };
                }
                var rb = e._rb;

                // Normal volume path (always reliable)
                if (t <= 1.0) {
                    if (rb.gain) {
                        try { rb.gain.gain.value = 0.0; } catch (err) {}
                    }
                    if (rb.boosting) {
                        if (typeof rb.prevMuted === "boolean") {
                            e.muted = rb.prevMuted;
                        }
                        rb.boosting = false;
                    }
                    e.volume = t;
                    continue;
                }

                // Boost path (WebAudio required)
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) {
                    e.volume = 1;
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
                    if (!rb.boosting) {
                        rb.prevMuted = e.muted === true;
                        rb.boosting = true;
                    }
                    // Keep native path audible and add extra gain on the WebAudio path.
                    e.volume = 1;
                    rb.gain.gain.value = Math.max(0, t - 1);
                } else {
                    if (rb.gain) {
                        try { rb.gain.gain.value = 0.0; } catch (err) {}
                    }
                    if (rb.boosting) {
                        if (typeof rb.prevMuted === "boolean") {
                            e.muted = rb.prevMuted;
                        }
                        rb.boosting = false;
                    }
                    e.volume = 1;
                }
            } catch (err) {
                console.error("Raycast Boost Error:", err);
                if (e._rb && e._rb.gain) {
                    try { e._rb.gain.gain.value = 0.0; } catch (err2) {}
                }
                e.volume = (t > 1) ? 1 : t;
                if (e._rb && e._rb.boosting) {
                    if (typeof e._rb.prevMuted === "boolean") {
                        e.muted = e._rb.prevMuted;
                    }
                    e._rb.boosting = false;
                }
            }
        }
    })();
  `;

  // Use JSON.stringify to safely escape the JS string for AppleScript
  // Slice(1, -1) removes the surrounding quotes added by stringify
  const jsEscaped = JSON.stringify(browserJs).slice(1, -1);

  let script = "";
  const lowerName = appName.toLowerCase();

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
          set volume to ${clampedVolume}
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
          set audio volume to ${clampedVolume * 4}
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
        run script "tell application \\"${appName}\\" to set sound volume to ${clampedVolume}"
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
            set sound volume to ${clampedVolume}
            return "true"
          on error
            try
              set audio volume to ${volFraction}
              return "true"
            on error
              set volume to ${clampedVolume}
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
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return "error: " + msg;
  }
}

async function isFineTuneInstalled(): Promise<boolean> {
  try {
    await access(FINETUNE_APP_PATH);
    return true;
  } catch {
    return false;
  }
}

async function readFineTuneSettings(): Promise<FineTuneSettings> {
  try {
    const raw = await readFile(FINETUNE_SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<FineTuneSettings>;
    return {
      appDeviceRouting: parsed.appDeviceRouting ?? {},
      appMutes: parsed.appMutes ?? {},
      appEQSettings: parsed.appEQSettings ?? {},
      appVolumes: parsed.appVolumes ?? {},
      version: parsed.version ?? 4,
    };
  } catch {
    await mkdir(FINETUNE_SETTINGS_DIR, { recursive: true });
    return {
      appDeviceRouting: {},
      appMutes: {},
      appEQSettings: {},
      appVolumes: {},
      version: 4,
    };
  }
}

async function writeFineTuneSettings(settings: FineTuneSettings): Promise<void> {
  await mkdir(FINETUNE_SETTINGS_DIR, { recursive: true });
  const tempPath = `${FINETUNE_SETTINGS_PATH}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(settings));
  await rename(tempPath, FINETUNE_SETTINGS_PATH);
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

async function updateFineTuneSettings(mutator: (settings: FineTuneSettings) => void): Promise<boolean> {
  try {
    if (!(await isFineTuneInstalled())) return false;
    await stopFineTune();
    const settings = await readFineTuneSettings();
    mutator(settings);
    await writeFineTuneSettings(settings);
    await startFineTune();
    return true;
  } catch {
    return false;
  }
}

async function getFineTuneStoredVolume(bundleId: string): Promise<number | null> {
  try {
    if (!(await isFineTuneInstalled())) return null;
    const settings = await readFineTuneSettings();
    const stored = settings.appVolumes[bundleId];
    return typeof stored === "number" ? stored : null;
  } catch {
    return null;
  }
}

async function setFineTuneBoostVolume(bundleId: string, normalizedVolume: number): Promise<boolean> {
  const target = Math.max(0, Math.min(2, normalizedVolume));
  const current = await getFineTuneStoredVolume(bundleId);
  if (current !== null && Math.abs(current - target) < 0.001) {
    return true;
  }

  return updateFineTuneSettings((settings) => {
    settings.appVolumes[bundleId] = target;
  });
}

async function clearFineTuneBoostVolume(bundleId: string): Promise<void> {
  const current = await getFineTuneStoredVolume(bundleId);
  if (current === null || current <= 1.001) return;

  await updateFineTuneSettings((settings) => {
    settings.appVolumes[bundleId] = 1;
  });
}

export async function getAppOutputDevice(bundleId: string): Promise<string | null> {
  try {
    if (!(await isFineTuneInstalled())) return null;
    const settings = await readFineTuneSettings();
    return settings.appDeviceRouting[bundleId] ?? null;
  } catch {
    return null;
  }
}

// Configure application output device through FineTune's routing settings.
export async function setAppOutputDevice(bundleId: string, deviceUid: string): Promise<boolean> {
  try {
    const success = await updateFineTuneSettings((settings) => {
      settings.appDeviceRouting[bundleId] = deviceUid;
    });
    if (!success) return false;
    await enforceBluetoothInputSafety(deviceUid);
    return true;
  } catch {
    return false;
  }
}

export async function removeAppOutputDevice(bundleId: string): Promise<boolean> {
  return updateFineTuneSettings((settings) => {
    delete settings.appDeviceRouting[bundleId];
  });
}

export async function resetControlAppVolumeSettings(): Promise<boolean> {
  if (!(await isFineTuneInstalled())) {
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
