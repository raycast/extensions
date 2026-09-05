import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  WifiStatus,
  WifiNetwork,
  BluetoothStatus,
  BluetoothDevice,
  BluetoothDeviceCategory,
} from "../types";
import {
  calculateSessionUsage,
  clearSessionBaseline,
  getCachedInternetSpeed,
  type SessionDataUsage,
} from "../speedService";

let environmentAssetsPath: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raycastApi = require("@raycast/api");
  environmentAssetsPath = raycastApi?.environment?.assetsPath;
} catch {
  // Fallback when executed outside the Raycast host environment
}

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const WINRT_ASYNC_PREAMBLE = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' }
function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(4000) | Out-Null
    $netTask.Result
}
`;

/**
 * Runs a PowerShell command with minimal overhead.
 */
async function runPowerShell(command: string): Promise<string> {
  const b64 = Buffer.from(command, "utf16le").toString("base64");
  if (b64.length < 6000) {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -NoLogo -ExecutionPolicy Bypass -EncodedCommand ${b64}`,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return stdout.trim();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-NoLogo",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "-",
      ],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `PowerShell exited with code ${code}`));
      }
    });
    child.stdin.write(command);
    child.stdin.end();
  });
}

/**
 * Runs netsh directly via execFile without cmd.exe shell overhead.
 */
async function runNetsh(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("netsh", args, {
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * Runs a shell/cmd command directly (e.g. for start ms-settings:).
 */
async function runCmd(command: string): Promise<string> {
  const { stdout } = await execAsync(command, { windowsHide: true });
  return stdout.trim();
}

let cachedInterfacesOutput: { text: string; timestamp: number } | null = null;
let pendingInterfacesPromise: Promise<string> | null = null;

export function invalidateWindowsWifiCache(): void {
  cachedInterfacesOutput = null;
}

async function getWlanInterfacesOutput(): Promise<string> {
  const now = Date.now();
  if (cachedInterfacesOutput && now - cachedInterfacesOutput.timestamp < 1000) {
    return cachedInterfacesOutput.text;
  }
  if (pendingInterfacesPromise) {
    return pendingInterfacesPromise;
  }
  pendingInterfacesPromise = runNetsh(["wlan", "show", "interfaces"])
    .then((text) => {
      cachedInterfacesOutput = { text, timestamp: Date.now() };
      return text;
    })
    .finally(() => {
      pendingInterfacesPromise = null;
    });
  return pendingInterfacesPromise;
}

function getHelperExePath(): string | undefined {
  const searchDirs = [
    environmentAssetsPath,
    path.join(__dirname, "assets"),
    path.join(__dirname, "..", "assets"),
    path.resolve(process.cwd(), "assets"),
  ].filter(Boolean) as string[];

  for (const dir of searchDirs) {
    const fullPath = path.join(dir, "quick-radios-helper.exe");
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return undefined;
}

/**
 * Toggles or sets a Windows radio state (Wi-Fi = 1, Bluetooth = 3) via compiled WinRT helper with PowerShell fallback.
 */
async function toggleWindowsRadio(
  kind: 1 | 3,
  targetState?: boolean,
): Promise<boolean> {
  invalidateWindowsWifiCache();

  const helperExe = getHelperExePath();
  const kindArg = kind === 1 ? "wifi" : "bt";
  const stateArg = targetState === undefined ? "" : targetState ? "on" : "off";

  if (helperExe) {
    try {
      const args = stateArg
        ? ["toggle", kindArg, stateArg]
        : ["toggle", kindArg];
      const { stdout } = await execFileAsync(helperExe, args, {
        windowsHide: true,
      });
      const trimmed = stdout.trim();
      if (trimmed === "NotFound") {
        throw new Error(
          `${kind === 1 ? "Wi-Fi" : "Bluetooth"} radio adapter not found on this system`,
        );
      }
      if (trimmed === "On" || trimmed === "Off") {
        return trimmed === "On";
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("not found on this system")
      ) {
        throw err;
      }
      // Otherwise fall back to PowerShell below
    }
  }

  // Fallback to PowerShell WinRT implementation
  const targetStr = targetState === undefined ? "" : targetState ? "On" : "Off";
  const script = `
${WINRT_ASYNC_PREAMBLE}
[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
$radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
$radio = $radios | Where-Object { $_.Kind -eq ${kind} }
if ($radio) {
    $target = '${targetStr}'
    if ($target -eq '') {
        $cur = $radio.State.ToString()
        $target = if ($cur -eq '1' -or $cur -eq 'On') { 'Off' } else { 'On' }
    }
    Await ($radio.SetStateAsync($target)) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
    $target
} else {
    'NotFound'
}
`;
  const result = await runPowerShell(script);
  if (result === "NotFound") {
    throw new Error(
      `${kind === 1 ? "Wi-Fi" : "Bluetooth"} radio adapter not found on this system`,
    );
  }
  return result === "On" || result === "1";
}

export function parseSubinterfaceBytes(
  output: string,
  ifaceName: string,
): { bytesIn: number; bytesOut: number } | undefined {
  try {
    const lines = output.split("\n").map((l) => l.trim());
    const targetIfaceLower = ifaceName.toLowerCase();

    // Pass 1: exact match
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const lineIface = parts.slice(4).join(" ").toLowerCase();
        if (lineIface === targetIfaceLower) {
          const bytesIn = parseInt(parts[2], 10);
          const bytesOut = parseInt(parts[3], 10);
          if (!isNaN(bytesIn) && !isNaN(bytesOut)) {
            return {
              bytesIn: Math.max(0, bytesIn),
              bytesOut: Math.max(0, bytesOut),
            };
          }
        }
      }
    }

    // Pass 2: fallback substring matching, avoiding virtual / direct adapter false matches
    const targetIsVirtualOrDirect =
      targetIfaceLower.includes("direct") ||
      targetIfaceLower.includes("virtual");

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const lineIface = parts.slice(4).join(" ").toLowerCase();
        const isVirtualOrDirect =
          lineIface.includes("direct") || lineIface.includes("virtual");
        if (isVirtualOrDirect !== targetIsVirtualOrDirect) {
          continue;
        }
        if (
          lineIface.includes(targetIfaceLower) ||
          targetIfaceLower.includes(lineIface) ||
          (targetIfaceLower.includes("wi-fi") && lineIface.includes("wi-fi"))
        ) {
          const bytesIn = parseInt(parts[2], 10);
          const bytesOut = parseInt(parts[3], 10);
          if (!isNaN(bytesIn) && !isNaN(bytesOut)) {
            return {
              bytesIn: Math.max(0, bytesIn),
              bytesOut: Math.max(0, bytesOut),
            };
          }
        }
      }
    }
  } catch {
    // Return undefined on parsing failure
  }
  return undefined;
}

/**
 * Retrieves the current Wi-Fi connection and interface status.
 */
export async function getWindowsWifiStatus(): Promise<WifiStatus> {
  try {
    const interfacesOutput = await getWlanInterfacesOutput();

    if (
      !interfacesOutput ||
      interfacesOutput.includes("There is no wireless interface on the system")
    ) {
      return { isOn: false, isConnected: false };
    }

    const isOff =
      interfacesOutput.includes("Software Off") ||
      interfacesOutput.includes("Hardware Off");

    if (isOff) {
      return { isOn: false, isConnected: false };
    }

    // Segment output into individual interface blocks to correctly target the connected adapter
    const interfaceBlocks = interfacesOutput
      .split(/(?=(?:^|\r?\n)\s*Name\s*:)/i)
      .filter((b) => /Name\s*:/i.test(b));

    const activeBlock =
      interfaceBlocks.find((b) => /State\s*:\s*connected/i.test(b)) ||
      interfaceBlocks[0] ||
      interfacesOutput;

    const isConnected = /State\s*:\s*connected/i.test(activeBlock);
    const ifaceMatch = activeBlock.match(/^\s*Name\s*:\s*(.+)$/m);
    const ifaceName = ifaceMatch ? ifaceMatch[1].trim() : "Wi-Fi";
    const ssidMatch = activeBlock.match(/SSID\s*:\s*(.+)/i);
    const bssidMatch = activeBlock.match(/AP BSSID\s*:\s*(.+)/i);
    const signalMatch = activeBlock.match(/Signal\s*:\s*(\d+)%/i);
    const bandMatch = activeBlock.match(/Band\s*:\s*(.+)/i);
    const channelMatch = activeBlock.match(/Channel\s*:\s*(\d+)/i);
    const radioTypeMatch = activeBlock.match(/Radio type\s*:\s*(.+)/i);
    const authMatch = activeBlock.match(/Authentication\s*:\s*(.+)/i);
    const cipherMatch = activeBlock.match(/Cipher\s*:\s*(.+)/i);
    const macMatch = activeBlock.match(/Physical address\s*:\s*(.+)/i);
    const rxMatch = activeBlock.match(/Receive rate \(Mbps\)\s*:\s*([\d.]+)/i);
    const txMatch = activeBlock.match(/Transmit rate \(Mbps\)\s*:\s*([\d.]+)/i);

    let ipAddress: string | undefined;
    let gateway: string | undefined;
    let sessionData: SessionDataUsage | undefined;

    if (isConnected) {
      // 1. IP Address from Node.js in-memory network interfaces (0ms)
      const netIfaces = os.networkInterfaces();
      const ifaceAddrs = netIfaces[ifaceName];
      if (ifaceAddrs) {
        const ipv4Obj = ifaceAddrs.find(
          (a) => a.family === "IPv4" && !a.internal,
        );
        if (ipv4Obj) ipAddress = ipv4Obj.address;
      }
      if (!ipAddress && macMatch) {
        const cleanMac = macMatch[1].replace(/[:-]/g, "").toLowerCase();
        for (const addrs of Object.values(netIfaces)) {
          if (
            addrs?.some(
              (a) => a.mac.replace(/[:-]/g, "").toLowerCase() === cleanMac,
            )
          ) {
            const ipv4Obj = addrs.find(
              (a) => a.family === "IPv4" && !a.internal,
            );
            if (ipv4Obj) {
              ipAddress = ipv4Obj.address;
              break;
            }
          }
        }
      }

      // 2. Gateway, session data, and connection event in parallel via fast native commands (~100ms total)
      const [ipv4ConfigRes, ipv4SubRes, ipv6SubRes, wlanEventRes] =
        await Promise.allSettled([
          runNetsh(["interface", "ipv4", "show", "config", ifaceName]),
          runNetsh(["interface", "ipv4", "show", "subinterfaces"]),
          runNetsh(["interface", "ipv6", "show", "subinterfaces"]),
          execFileAsync(
            "wevtutil",
            [
              "qe",
              "Microsoft-Windows-WLAN-AutoConfig/Operational",
              "/c:1",
              "/q:*[System[(EventID=8001 or EventID=8003)]]",
              "/rd:true",
              "/f:xml",
            ],
            { windowsHide: true },
          ),
        ]);

      let connectionKey: string | undefined;
      if (wlanEventRes.status === "fulfilled" && wlanEventRes.value?.stdout) {
        const xml = wlanEventRes.value.stdout;
        const evId = xml.match(/<EventID>(\d+)<\/EventID>/)?.[1];
        if (evId === "8003") {
          clearSessionBaseline();
        } else if (evId === "8001") {
          const connId = xml.match(
            /<Data Name=['"]ConnectionId['"]>([^<]+)<\/Data>/,
          )?.[1];
          const recId = xml.match(/<EventRecordID>(\d+)<\/EventRecordID>/)?.[1];
          const time = xml.match(
            /<TimeCreated SystemTime=['"]([^'"]+)['"]/,
          )?.[1];
          connectionKey = connId ? `${connId}_${recId || time}` : recId || time;
        }
      }

      if (ipv4ConfigRes.status === "fulfilled" && ipv4ConfigRes.value) {
        const gwMatch = ipv4ConfigRes.value.match(
          /Default Gateway\s*:\s*([^\r\n]+)/i,
        );
        if (gwMatch && gwMatch[1].trim()) {
          gateway = gwMatch[1].trim();
        }
        if (!ipAddress) {
          const ipMatch = ipv4ConfigRes.value.match(
            /IP Address\s*:\s*([^\r\n]+)/i,
          );
          if (ipMatch) ipAddress = ipMatch[1].trim();
        }
      }

      if (!gateway) {
        try {
          const { stdout: routeOut } = await execFileAsync(
            "route",
            ["print", "0.0.0.0"],
            { windowsHide: true },
          );
          const routeMatch = routeOut.match(
            /0\.0\.0\.0\s+0\.0\.0\.0\s+([0-9.]+)/i,
          );
          if (routeMatch) gateway = routeMatch[1].trim();
        } catch {
          // Fallback if route print fails
        }
      }

      if (ssidMatch) {
        let totalBytesIn = 0;
        let totalBytesOut = 0;
        let hasValidCounters = false;

        if (ipv4SubRes.status === "fulfilled" && ipv4SubRes.value) {
          const ipv4Counters = parseSubinterfaceBytes(
            ipv4SubRes.value,
            ifaceName,
          );
          if (ipv4Counters) {
            totalBytesIn += ipv4Counters.bytesIn;
            totalBytesOut += ipv4Counters.bytesOut;
            hasValidCounters = true;
          }
        }

        if (ipv6SubRes.status === "fulfilled" && ipv6SubRes.value) {
          const ipv6Counters = parseSubinterfaceBytes(
            ipv6SubRes.value,
            ifaceName,
          );
          if (ipv6Counters) {
            totalBytesIn += ipv6Counters.bytesIn;
            totalBytesOut += ipv6Counters.bytesOut;
            hasValidCounters = true;
          }
        }

        if (hasValidCounters) {
          sessionData = calculateSessionUsage(
            ssidMatch[1].trim(),
            totalBytesIn,
            totalBytesOut,
            connectionKey,
          );
        }
      }
    } else {
      clearSessionBaseline();
    }

    return {
      isOn: true,
      isConnected,
      ssid: ssidMatch ? ssidMatch[1].trim() : undefined,
      bssid: bssidMatch ? bssidMatch[1].trim() : undefined,
      signalPercent: signalMatch ? parseInt(signalMatch[1], 10) : undefined,
      band: bandMatch ? bandMatch[1].trim() : undefined,
      channel: channelMatch ? channelMatch[1].trim() : undefined,
      radioType: radioTypeMatch ? radioTypeMatch[1].trim() : undefined,
      authentication: authMatch ? authMatch[1].trim() : undefined,
      cipher: cipherMatch ? cipherMatch[1].trim() : undefined,
      macAddress: macMatch ? macMatch[1].trim() : undefined,
      receiveRateMbps: rxMatch ? parseFloat(rxMatch[1]) : undefined,
      transmitRateMbps: txMatch ? parseFloat(txMatch[1]) : undefined,
      ipAddress,
      gateway,
      sessionData,
      internetSpeed: isConnected ? getCachedInternetSpeed() : undefined,
    };
  } catch {
    clearSessionBaseline();
    return { isOn: false, isConnected: false };
  }
}

/**
 * Toggles Wi-Fi radio power on or off without requiring admin privileges.
 */
export async function toggleWindowsWifi(
  targetState?: boolean,
): Promise<boolean> {
  if (targetState === false) {
    clearSessionBaseline();
  }
  return toggleWindowsRadio(1, targetState);
}

/**
 * Retrieves visible nearby Wi-Fi networks and merges saved profile information.
 * When activeScan is true, triggers a fast hardware channel scan before querying visible networks.
 */
export async function getWindowsWifiNetworks(
  activeScan = true,
): Promise<WifiNetwork[]> {
  try {
    const interfacesOutput = await getWlanInterfacesOutput();
    if (
      !interfacesOutput ||
      interfacesOutput.includes(
        "There is no wireless interface on the system",
      ) ||
      interfacesOutput.includes("Software Off") ||
      interfacesOutput.includes("Hardware Off")
    ) {
      return [];
    }

    const connectedMatch = /State\s*:\s*connected/i.test(interfacesOutput);
    const ssidMatch = interfacesOutput.match(/SSID\s*:\s*(.+)/i);
    const bssidMatch = interfacesOutput.match(/AP BSSID\s*:\s*(.+)/i);
    const signalMatch = interfacesOutput.match(/Signal\s*:\s*(\d+)%/i);
    const connectedSsid =
      connectedMatch && ssidMatch ? ssidMatch[1].trim() : undefined;
    const connectedBssid =
      connectedMatch && bssidMatch
        ? bssidMatch[1].trim().toLowerCase()
        : undefined;
    const connectedSignal = signalMatch ? parseInt(signalMatch[1], 10) : 0;

    let scanPromise: Promise<string>;
    if (activeScan) {
      const helperExe = getHelperExePath();
      if (helperExe) {
        scanPromise = (async () => {
          try {
            await execFileAsync(helperExe, ["scan"], { windowsHide: true });
            await new Promise((resolve) => setTimeout(resolve, 250));
          } catch {
            // fallback
          }
          return runNetsh(["wlan", "show", "networks", "mode=bssid"]);
        })();
      } else {
        scanPromise = runNetsh(["wlan", "show", "networks", "mode=bssid"]);
      }
    } else {
      scanPromise = runNetsh(["wlan", "show", "networks", "mode=bssid"]);
    }

    const [networksOutput, profilesOutput] = await Promise.all([
      scanPromise,
      runNetsh(["wlan", "show", "profiles"]),
    ]);

    const savedProfiles = new Set<string>();
    const profileRegex = /All User Profile\s*:\s*(.+)/gi;
    let match: RegExpExecArray | null;
    while ((match = profileRegex.exec(profilesOutput)) !== null) {
      savedProfiles.add(match[1].trim());
    }

    const networks: Map<string, WifiNetwork> = new Map();

    const networkBlocks = networksOutput
      .split(/(?:^|\r?\n)SSID\s+\d+\s*:\s*/i)
      .slice(1);
    for (const block of networkBlocks) {
      const lines = block.split("\n").map((l) => l.trim());
      const ssid = lines[0] || "";
      if (!ssid) continue;

      const authMatch = block.match(/Authentication\s*:\s*(.+)/i);
      const encMatch = block.match(/Encryption\s*:\s*(.+)/i);

      const authentication = authMatch ? authMatch[1].trim() : "Open";
      const encryption = encMatch ? encMatch[1].trim() : "None";
      const isConnected = ssid === connectedSsid;

      // Parse all BSSIDs for this network to find the connected or highest signal AP
      const bssidBlocks = block
        .split(/(?:^|\r?\n)\s*BSSID\s+\d+\s*:\s*/i)
        .slice(1);

      let bestSignal = 0;
      let bestBand: string | undefined;

      for (const bBlock of bssidBlocks) {
        const bssidHexMatch = bBlock.match(/^([0-9a-fA-F:-]{11,17})/);
        const bssidHex = bssidHexMatch
          ? bssidHexMatch[1].trim().toLowerCase()
          : undefined;
        const sigMatch = bBlock.match(/Signal\s*:\s*(\d+)%/i);
        const bandMatch = bBlock.match(/Band\s*:\s*([^\r\n]+)/i);

        const sig = sigMatch ? parseInt(sigMatch[1], 10) : 0;
        const band = bandMatch ? bandMatch[1].trim() : undefined;

        if (isConnected && connectedBssid && bssidHex === connectedBssid) {
          bestSignal = sig;
          bestBand = band;
          break;
        }

        if (sig > bestSignal) {
          bestSignal = sig;
          bestBand = band;
        }
      }

      if (bssidBlocks.length === 0) {
        const sigMatch = block.match(/Signal\s*:\s*(\d+)%/i);
        const bandMatch = block.match(/Band\s*:\s*(.+)/i);
        bestSignal = sigMatch ? parseInt(sigMatch[1], 10) : 0;
        bestBand = bandMatch ? bandMatch[1].trim() : undefined;
      }

      const finalSignal =
        isConnected && connectedSignal
          ? Math.max(bestSignal, connectedSignal)
          : bestSignal;

      const existing = networks.get(ssid);
      if (!existing || finalSignal > existing.signalPercent) {
        networks.set(ssid, {
          ssid,
          signalPercent: finalSignal,
          authentication,
          encryption,
          isSaved: savedProfiles.has(ssid),
          isConnected,
          band: bestBand || existing?.band,
        });
      }
    }

    for (const profileName of savedProfiles) {
      if (!networks.has(profileName)) {
        networks.set(profileName, {
          ssid: profileName,
          signalPercent: 0,
          authentication: "Saved",
          isSaved: true,
          isConnected: profileName === connectedSsid,
        });
      }
    }

    return Array.from(networks.values()).sort((a, b) => {
      // 1. Connected Wi-Fi network
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;

      // 2. Saved and in range
      const aSavedInRange = a.isSaved && a.signalPercent > 0;
      const bSavedInRange = b.isSaved && b.signalPercent > 0;
      if (aSavedInRange && !bSavedInRange) return -1;
      if (!aSavedInRange && bSavedInRange) return 1;

      // 3. In range (not saved)
      const aInRange = !a.isSaved && a.signalPercent > 0;
      const bInRange = !b.isSaved && b.signalPercent > 0;
      if (aInRange && !bInRange) return -1;
      if (!aInRange && bInRange) return 1;

      // 4. Saved but not in range
      const aSavedOut = a.isSaved && a.signalPercent === 0;
      const bSavedOut = b.isSaved && b.signalPercent === 0;
      if (aSavedOut && !bSavedOut) return -1;
      if (!aSavedOut && bSavedOut) return 1;

      return b.signalPercent - a.signalPercent || a.ssid.localeCompare(b.ssid);
    });
  } catch {
    return [];
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Connects to a Wi-Fi network by SSID. If a password is provided for an unsaved network,
 * creates a temporary XML profile.
 */
export async function connectWindowsWifi(
  ssid: string,
  password?: string,
): Promise<void> {
  if (password) {
    const escapedSsid = escapeXml(ssid);
    const escapedPassword = escapeXml(password);
    const hexSsid = Buffer.from(ssid, "utf-8").toString("hex");
    const profileXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
    <name>${escapedSsid}</name>
    <SSIDConfig>
        <SSID>
            <hex>${hexSsid}</hex>
            <name>${escapedSsid}</name>
        </SSID>
    </SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>auto</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>WPA2PSK</authentication>
                <encryption>AES</encryption>
                <useOneX>false</useOneX>
            </authEncryption>
            <sharedKey>
                <keyType>passPhrase</keyType>
                <protected>false</protected>
                <keyMaterial>${escapedPassword}</keyMaterial>
            </sharedKey>
        </security>
    </MSM>
</WLANProfile>`;

    const tempPath = path.join(os.tmpdir(), `wifi_prof_${Date.now()}.xml`);
    fs.writeFileSync(tempPath, profileXml, "utf-8");
    try {
      await runNetsh([
        "wlan",
        "add",
        "profile",
        `filename=${tempPath}`,
        "user=current",
      ]);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  clearSessionBaseline();
  invalidateWindowsWifiCache();
  await runNetsh(["wlan", "connect", `name=${ssid}`]);
}

/**
 * Disconnects the active Wi-Fi connection.
 */
export async function disconnectWindowsWifi(): Promise<void> {
  clearSessionBaseline();
  invalidateWindowsWifiCache();
  await runNetsh(["wlan", "disconnect"]);
}

/**
 * Retrieves the cleartext password for a saved Wi-Fi network.
 */
export async function getWindowsWifiPassword(
  ssid: string,
): Promise<string | undefined> {
  try {
    const profileOutput = await runNetsh([
      "wlan",
      "show",
      "profile",
      `name=${ssid}`,
      "key=clear",
    ]);
    const keyMatch = profileOutput.match(/Key Content\s*:\s*(.+)/i);
    return keyMatch ? keyMatch[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Gets the current Bluetooth radio power state using WinRT Radio API.
 */
export async function getWindowsBluetoothStatus(): Promise<BluetoothStatus> {
  const helperExe = getHelperExePath();
  if (helperExe) {
    try {
      const { stdout } = await execFileAsync(helperExe, ["status", "bt"], {
        windowsHide: true,
      });
      const trimmed = stdout.trim();
      if (trimmed === "On" || trimmed === "Off") {
        return { isOn: trimmed === "On" };
      }
    } catch {
      // Fallback to PowerShell
    }
  }

  const script = `
${WINRT_ASYNC_PREAMBLE}
[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
$radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
$bt = $radios | Where-Object { $_.Kind -eq 3 }
if ($bt) { $bt.State.ToString() } else { 'Unknown' }
`;
  try {
    const result = await runPowerShell(script);
    const isOn = result === "1" || result.toLowerCase() === "on";
    return { isOn };
  } catch {
    return { isOn: false };
  }
}

/**
 * Toggles Bluetooth radio power on or off without requiring admin privileges.
 */
export async function toggleWindowsBluetooth(
  targetState?: boolean,
): Promise<boolean> {
  return toggleWindowsRadio(3, targetState);
}

/**
 * Retrieves all paired Bluetooth devices with connection status and categorized types.
 */
export async function getWindowsBluetoothDevices(): Promise<BluetoothDevice[]> {
  const helperExe = getHelperExePath();
  if (helperExe) {
    try {
      const { stdout } = await execFileAsync(helperExe, ["devices"], {
        windowsHide: true,
      });
      const trimmed = stdout.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const list = JSON.parse(trimmed);
        if (Array.isArray(list)) {
          return list.map(
            (item: {
              Id: string;
              Name: string;
              Address: string;
              IsConnected: boolean;
            }) => ({
              id: item.Id,
              name: item.Name,
              address: item.Address,
              category: categorizeBluetoothDevice(item.Name),
              isConnected: Boolean(item.IsConnected),
            }),
          );
        }
      }
    } catch {
      // Fall back to PowerShell if helper fails
    }
  }

  const script = `
${WINRT_ASYNC_PREAMBLE}
[Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null

$radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
$bt = $radios | Where-Object { $_.Kind -eq 3 }
$isBtOn = if ($bt) { $bt.State.ToString() -eq '1' -or $bt.State.ToString() -eq 'On' } else { $true }

$pnpDevices = Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'BTHENUM\\DEV_*' }
$results = @()

foreach ($dev in $pnpDevices) {
    $macRaw = $dev.InstanceId -replace '.*DEV_([0-9A-Fa-f]{12}).*', '$1'
    $isConnected = $false
    
    if ($isBtOn -and ($macRaw -match '^[0-9A-Fa-f]{12}$')) {
        try {
            $macNum = [Convert]::ToUInt64($macRaw, 16)
            $btDev = Await ([Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($macNum)) ([Windows.Devices.Bluetooth.BluetoothDevice])
            if ($btDev -and $btDev.ConnectionStatus -eq [Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected) {
                $isConnected = $true
            }
        } catch {}
    }

    $formattedMac = if ($macRaw -match '^[0-9A-Fa-f]{12}$') {
        ($macRaw -split '(?<=\\G..)(?!$)' -join ':').ToUpper()
    } else { $macRaw }

    $results += [PSCustomObject]@{
        Id = $dev.InstanceId
        Name = $dev.FriendlyName
        Address = $formattedMac
        IsConnected = $isConnected
    }
}
$results | ConvertTo-Json -Depth 2
`;

  try {
    const jsonOutput = await runPowerShell(script);
    if (!jsonOutput) return [];
    const parsed = JSON.parse(jsonOutput);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    return list.map(
      (item: {
        Id: string;
        Name: string;
        Address: string;
        IsConnected: boolean;
      }) => ({
        id: item.Id,
        name: item.Name,
        address: item.Address,
        category: categorizeBluetoothDevice(item.Name),
        isConnected: Boolean(item.IsConnected),
      }),
    );
  } catch {
    return [];
  }
}

function categorizeBluetoothDevice(name: string): BluetoothDeviceCategory {
  const lower = name.toLowerCase();
  if (
    /buds|headset|headphones|speaker|earphones|airpods|audio|echo|sound/i.test(
      lower,
    )
  ) {
    return "audio";
  }
  if (/controller|gamepad|xbox|dualsense|playstation|joystick/i.test(lower)) {
    return "controller";
  }
  if (/mouse|keyboard|pen|trackpad|stylus|input/i.test(lower)) {
    return "peripheral";
  }
  if (/phone|galaxy|iphone|pixel|android/i.test(lower)) {
    return "phone";
  }
  return "other";
}

/**
 * Connects or disconnects a Bluetooth device on Windows.
 */
export async function toggleWindowsBluetoothDeviceConnection(
  deviceId: string,
  connect: boolean,
): Promise<void> {
  const macMatch = deviceId.match(/DEV_([0-9A-Fa-f]{12})/i);
  const cleanMac = deviceId.replace(/[^0-9A-Fa-f]/g, "");
  const macHex = macMatch
    ? macMatch[1]
    : cleanMac.length === 12
      ? cleanMac
      : undefined;

  if (!macHex) {
    throw new Error(
      `Unable to identify Bluetooth device hardware MAC address for: ${deviceId}`,
    );
  }

  const helperExe = getHelperExePath();
  if (!helperExe) {
    throw new Error("Quick Radios helper executable not found");
  }

  let stdout = "";
  try {
    const res = await execFileAsync(
      helperExe,
      [connect ? "connect" : "disconnect", macHex],
      { windowsHide: true },
    );
    stdout = res.stdout;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string | Buffer; message?: string };
    stdout = (execErr?.stdout ?? "").toString();
    if (!stdout && err instanceof Error) {
      throw err;
    }
  }

  const trimmed = stdout.trim();
  if (connect) {
    if (trimmed.includes("Connected")) {
      return;
    }
    if (trimmed.includes("Timeout") || trimmed.includes("FailedToConnect")) {
      throw new Error(
        "Device did not respond or is not in range. Ensure it is turned on and ready to connect.",
      );
    }
    if (trimmed.startsWith("Error:")) {
      throw new Error(trimmed);
    }
    throw new Error(trimmed || "Failed to connect device");
  } else {
    if (trimmed.includes("Disconnected")) {
      return;
    }
    if (trimmed.includes("FailedToDisconnect")) {
      throw new Error("Failed to disconnect device");
    }
    if (trimmed.startsWith("Error:")) {
      throw new Error(trimmed);
    }
    throw new Error(trimmed || "Failed to disconnect device");
  }
}

/**
 * Opens Windows Wi-Fi Settings directly.
 */
export async function openWindowsWifiSettings(): Promise<void> {
  await runCmd("start ms-settings:network-wifi");
}

/**
 * Opens Windows Bluetooth Settings directly.
 */
export async function openWindowsBluetoothSettings(): Promise<void> {
  await runCmd("start ms-settings:bluetooth");
}
