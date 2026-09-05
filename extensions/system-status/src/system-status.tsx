import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

const execFileAsync = promisify(execFile);
const REFRESH_INTERVAL_MS = 15_000;
const CLOCK_TICK_MS = 1_000;

type TimeFormat = Preferences["timeFormat"];
type DateFormat = Preferences["dateFormat"];
type DateDetailFormat = Preferences["dateDetailFormat"];

type SystemSnapshot = {
  network: {
    connected: boolean;
    name?: string;
    description?: string;
    type?: string;
    speed?: number;
    gateway?: string;
    addresses: string[];
    signalQuality?: number | null;
  };
  volume: {
    level: number;
    muted: boolean;
    deviceName: string;
    deviceKind: "headphones" | "speaker";
  };
  battery: {
    available: boolean;
    percentage: number | null;
    charging: boolean;
    saverOn: boolean;
    remainingSeconds: number;
    batteryFlag: number;
  };
};

type StatusItem = {
  id: "internet" | "volume" | "battery" | "time" | "date";
  label: string;
  title: string;
  accessory: string;
  icon: Icon;
  detail: string;
};

const SYSTEM_STATUS_SCRIPT = String.raw`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr pNotify);
  int UnregisterControlChangeNotify(IntPtr pNotify);
  int GetChannelCount(out uint pnChannelCount);
  int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int GetMasterVolumeLevel(out float pfLevelDB);
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);
  int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);
  int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
  int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
  int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
  int VolumeStepUp(Guid pguidEventContext);
  int VolumeStepDown(Guid pguidEventContext);
  int QueryHardwareSupport(out uint pdwHardwareSupportMask);
  int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}

[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
  int GetCount(out int cProps);
  int GetAt(int iProp, out PROPERTYKEY pkey);
  int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
  int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
  int Commit();
}

[StructLayout(LayoutKind.Sequential)]
struct PROPERTYKEY {
  public Guid fmtid;
  public int pid;
}

[StructLayout(LayoutKind.Explicit)]
struct PROPVARIANT {
  [FieldOffset(0)] public ushort vt;
  [FieldOffset(8)] public IntPtr pointerValue;
  [FieldOffset(8)] public uint uintVal;

  public string GetString() {
    if (vt == 31 && pointerValue != IntPtr.Zero) {
      return Marshal.PtrToStringUni(pointerValue);
    }

    return string.Empty;
  }

  public uint GetUInt() {
    if (vt == 19) {
      return uintVal;
    }

    return 0;
  }
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  int OpenPropertyStore(int stgmAccess, out IPropertyStore ppProperties);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
  int GetState(out int pdwState);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int NotImpl1();
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject {}

[StructLayout(LayoutKind.Sequential)]
struct SYSTEM_POWER_STATUS {
  public byte ACLineStatus;
  public byte BatteryFlag;
  public byte BatteryLifePercent;
  public byte SystemStatusFlag;
  public int BatteryLifeTime;
  public int BatteryFullLifeTime;
}

enum WLAN_INTERFACE_STATE {
  NotReady = 0,
  Connected = 1,
  AdHocNetworkFormed = 2,
  Disconnecting = 3,
  Disconnected = 4,
  Associating = 5,
  Discovering = 6,
  Authenticating = 7
}

enum WLAN_INTF_OPCODE {
  AutoconfEnabled = 1,
  BackgroundScanEnabled = 2,
  MediaStreamingMode = 3,
  RadioState = 4,
  BssType = 5,
  InterfaceState = 6,
  CurrentConnection = 7
}

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
struct WLAN_INTERFACE_INFO {
  public Guid InterfaceGuid;

  [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
  public string strInterfaceDescription;

  public WLAN_INTERFACE_STATE isState;
}

[StructLayout(LayoutKind.Sequential)]
struct DOT11_SSID {
  public uint uSSIDLength;

  [MarshalAs(UnmanagedType.ByValArray, SizeConst = 32)]
  public byte[] ucSSID;
}

[StructLayout(LayoutKind.Sequential)]
struct WLAN_ASSOCIATION_ATTRIBUTES {
  public DOT11_SSID dot11Ssid;
  public uint dot11BssType;

  [MarshalAs(UnmanagedType.ByValArray, SizeConst = 6)]
  public byte[] dot11Bssid;

  public uint dot11PhyType;
  public uint uDot11PhyIndex;
  public uint wlanSignalQuality;
  public uint ulRxRate;
  public uint ulTxRate;
}

[StructLayout(LayoutKind.Sequential)]
struct WLAN_SECURITY_ATTRIBUTES {
  [MarshalAs(UnmanagedType.Bool)] public bool bSecurityEnabled;
  [MarshalAs(UnmanagedType.Bool)] public bool bOneXEnabled;
  public uint dot11AuthAlgorithm;
  public uint dot11CipherAlgorithm;
}

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
struct WLAN_CONNECTION_ATTRIBUTES {
  public WLAN_INTERFACE_STATE isState;
  public uint wlanConnectionMode;

  [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
  public string strProfileName;

  public WLAN_ASSOCIATION_ATTRIBUTES wlanAssociationAttributes;
  public WLAN_SECURITY_ATTRIBUTES wlanSecurityAttributes;
}

public static class Native {
  [DllImport("kernel32.dll")]
  static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);

  [DllImport("ole32.dll")]
  static extern int PropVariantClear(ref PROPVARIANT pvar);

  [DllImport("wlanapi.dll")]
  static extern uint WlanOpenHandle(uint dwClientVersion, IntPtr pReserved, out uint pdwNegotiatedVersion, out IntPtr phClientHandle);

  [DllImport("wlanapi.dll")]
  static extern uint WlanCloseHandle(IntPtr hClientHandle, IntPtr pReserved);

  [DllImport("wlanapi.dll")]
  static extern uint WlanEnumInterfaces(IntPtr hClientHandle, IntPtr pReserved, out IntPtr ppInterfaceList);

  [DllImport("wlanapi.dll")]
  static extern uint WlanQueryInterface(
    IntPtr hClientHandle,
    ref Guid pInterfaceGuid,
    WLAN_INTF_OPCODE OpCode,
    IntPtr pReserved,
    out int pdwDataSize,
    out IntPtr ppData,
    IntPtr pWlanOpcodeValueType
  );

  [DllImport("wlanapi.dll")]
  static extern void WlanFreeMemory(IntPtr pMemory);

  static string Escape(string value) {
    if (string.IsNullOrEmpty(value)) {
      return string.Empty;
    }

    return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
  }

  static string ReadRegistryString(RegistryKey key, string name) {
    if (key == null) {
      return string.Empty;
    }

    object value = key.GetValue(name);
    return value == null ? string.Empty : value.ToString();
  }

  public static string GetVolumeInfoJson() {
    try {
    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));

    var iid = typeof(IAudioEndpointVolume).GUID;
    object obj;
    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out obj));

    var endpointVolume = (IAudioEndpointVolume)obj;
    float level;
    bool muted;
    Marshal.ThrowExceptionForHR(endpointVolume.GetMasterVolumeLevelScalar(out level));
    Marshal.ThrowExceptionForHR(endpointVolume.GetMute(out muted));

    IPropertyStore store;
    Marshal.ThrowExceptionForHR(device.OpenPropertyStore(0, out store));

    var friendlyNameKey = new PROPERTYKEY {
      fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"),
      pid = 14
    };

    var descriptionKey = new PROPERTYKEY {
      fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"),
      pid = 2
    };

    var interfaceFriendlyNameKey = new PROPERTYKEY {
      fmtid = new Guid("026e516e-b814-414b-83cd-856d6fef4822"),
      pid = 2
    };

    var formFactorKey = new PROPERTYKEY {
      fmtid = new Guid("1da5d803-d492-4edd-8c23-e0c0ffee7f0e"),
      pid = 0
    };

    PROPVARIANT friendlyNameValue = new PROPVARIANT();
    PROPVARIANT descriptionValue = new PROPVARIANT();
    PROPVARIANT interfaceFriendlyNameValue = new PROPVARIANT();
    PROPVARIANT formFactorValue = new PROPVARIANT();

    Marshal.ThrowExceptionForHR(store.GetValue(ref friendlyNameKey, out friendlyNameValue));
    Marshal.ThrowExceptionForHR(store.GetValue(ref descriptionKey, out descriptionValue));
    Marshal.ThrowExceptionForHR(store.GetValue(ref interfaceFriendlyNameKey, out interfaceFriendlyNameValue));
    Marshal.ThrowExceptionForHR(store.GetValue(ref formFactorKey, out formFactorValue));

    string friendlyName = friendlyNameValue.GetString();
    string description = descriptionValue.GetString();
    string interfaceFriendlyName = interfaceFriendlyNameValue.GetString();
    string deviceName =
      !string.IsNullOrWhiteSpace(friendlyName) ? friendlyName :
      !string.IsNullOrWhiteSpace(description) ? description :
      interfaceFriendlyName;

    if (string.IsNullOrWhiteSpace(deviceName)) {
      string deviceId;
      if (device.GetId(out deviceId) == 0 && !string.IsNullOrWhiteSpace(deviceId)) {
        try {
          using (RegistryKey endpointKey = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Enum\SWD\MMDEVAPI\" + deviceId)) {
            string registryFriendlyName = ReadRegistryString(endpointKey, "FriendlyName");
            string registryDescription = ReadRegistryString(endpointKey, "DeviceDesc");

            deviceName =
              !string.IsNullOrWhiteSpace(registryFriendlyName) ? registryFriendlyName :
              registryDescription;
          }
        } catch {
        }
      }
    }

    if (string.IsNullOrWhiteSpace(deviceName)) {
      deviceName = "Unknown";
    }

    uint formFactor = formFactorValue.GetUInt();
    string deviceKind = (formFactor == 3 || formFactor == 5 || formFactor == 6) ? "headphones" : "speaker";

    PropVariantClear(ref friendlyNameValue);
    PropVariantClear(ref descriptionValue);
    PropVariantClear(ref interfaceFriendlyNameValue);
    PropVariantClear(ref formFactorValue);

    return string.Format(
      "{{\"level\":{0},\"muted\":{1},\"deviceName\":\"{2}\",\"deviceKind\":\"{3}\"}}",
      Math.Round(level * 100),
      muted.ToString().ToLowerInvariant(),
      Escape(deviceName),
      deviceKind
    );
    } catch {
      return "{\"level\":0,\"muted\":false,\"deviceName\":\"Unknown\",\"deviceKind\":\"speaker\"}";
    }
  }

  public static string GetWirelessInfoJson() {
    IntPtr clientHandle = IntPtr.Zero;
    IntPtr interfaceList = IntPtr.Zero;

    try {
      uint negotiatedVersion;
      uint openResult = WlanOpenHandle(2, IntPtr.Zero, out negotiatedVersion, out clientHandle);
      if (openResult != 0) {
        return "{\"ssid\":null,\"signalQuality\":null}";
      }

      uint enumResult = WlanEnumInterfaces(clientHandle, IntPtr.Zero, out interfaceList);
      if (enumResult != 0 || interfaceList == IntPtr.Zero) {
        return "{\"ssid\":null,\"signalQuality\":null}";
      }

      int itemCount = Marshal.ReadInt32(interfaceList, 0);
      int infoSize = Marshal.SizeOf(typeof(WLAN_INTERFACE_INFO));
      long offset = 8;

      for (int i = 0; i < itemCount; i++) {
        IntPtr infoPtr = IntPtr.Add(interfaceList, (int)offset);
        WLAN_INTERFACE_INFO info = Marshal.PtrToStructure<WLAN_INTERFACE_INFO>(infoPtr);
        offset += infoSize;

        if (info.isState != WLAN_INTERFACE_STATE.Connected) {
          continue;
        }

        int dataSize;
        IntPtr dataPtr;
        uint queryResult = WlanQueryInterface(
          clientHandle,
          ref info.InterfaceGuid,
          WLAN_INTF_OPCODE.CurrentConnection,
          IntPtr.Zero,
          out dataSize,
          out dataPtr,
          IntPtr.Zero
        );

        if (queryResult != 0 || dataPtr == IntPtr.Zero) {
          continue;
        }

        try {
          WLAN_CONNECTION_ATTRIBUTES attributes = Marshal.PtrToStructure<WLAN_CONNECTION_ATTRIBUTES>(dataPtr);
          uint ssidLength = attributes.wlanAssociationAttributes.dot11Ssid.uSSIDLength;
          byte[] ssidBytes = attributes.wlanAssociationAttributes.dot11Ssid.ucSSID ?? Array.Empty<byte>();
          string ssid = (ssidLength > 0 && ssidLength <= ssidBytes.Length)
            ? Encoding.UTF8.GetString(ssidBytes, 0, (int)ssidLength)
            : string.Empty;

          return string.Format(
            "{{\"ssid\":{0},\"signalQuality\":{1}}}",
            string.IsNullOrWhiteSpace(ssid) ? "null" : "\"" + Escape(ssid) + "\"",
            attributes.wlanAssociationAttributes.wlanSignalQuality
          );
        } finally {
          WlanFreeMemory(dataPtr);
        }
      }

      return "{\"ssid\":null,\"signalQuality\":null}";
    } finally {
      if (interfaceList != IntPtr.Zero) {
        WlanFreeMemory(interfaceList);
      }

      if (clientHandle != IntPtr.Zero) {
        WlanCloseHandle(clientHandle, IntPtr.Zero);
      }
    }
  }

  public static string GetPowerInfoJson() {
    SYSTEM_POWER_STATUS status;
    if (!GetSystemPowerStatus(out status)) {
      return "{\"available\":false,\"percentage\":null,\"charging\":false,\"saverOn\":false,\"remainingSeconds\":-1,\"batteryFlag\":255}";
    }

    bool available = (status.BatteryFlag & 128) == 0;
    string percentage = available && status.BatteryLifePercent <= 100
      ? status.BatteryLifePercent.ToString()
      : "null";
    bool charging = (status.BatteryFlag & 8) == 8 || status.ACLineStatus == 1;

    bool saverOn = status.SystemStatusFlag == 1;

    return string.Format(
      "{{\"available\":{0},\"percentage\":{1},\"charging\":{2},\"saverOn\":{3},\"remainingSeconds\":{4},\"batteryFlag\":{5}}}",
      available.ToString().ToLowerInvariant(),
      percentage,
      charging.ToString().ToLowerInvariant(),
      saverOn.ToString().ToLowerInvariant(),
      status.BatteryLifeTime,
      status.BatteryFlag
    );
  }
}
"@

$adapter = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
  Where-Object {
    $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
    $_.NetworkInterfaceType -notin @(
      [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback,
      [System.Net.NetworkInformation.NetworkInterfaceType]::Tunnel
    )
  } |
  ForEach-Object {
    $properties = $_.GetIPProperties()

    $gateways = @(
      $properties.GatewayAddresses |
        Where-Object { $_.Address -and $_.Address.IPAddressToString -notin @("0.0.0.0", "::") } |
        ForEach-Object { $_.Address.IPAddressToString }
    )

    $addresses = @(
      $properties.UnicastAddresses |
        Where-Object {
          $_.Address.AddressFamily -in @(
            [System.Net.Sockets.AddressFamily]::InterNetwork,
            [System.Net.Sockets.AddressFamily]::InterNetworkV6
          )
        } |
        ForEach-Object { $_.Address.IPAddressToString }
    )

    if ($gateways.Count -gt 0 -and $addresses.Count -gt 0) {
      [PSCustomObject]@{
        name = $_.Name
        description = $_.Description
        type = $_.NetworkInterfaceType.ToString()
        speed = $_.Speed
        gateway = $gateways[0]
        addresses = $addresses
      }
    }
  } |
  Select-Object -First 1

$wirelessInfo = $null

if ($adapter -and $adapter.type -eq "Wireless80211") {
  try {
    $wirelessInfo = [Native]::GetWirelessInfoJson() | ConvertFrom-Json
  } catch {
    $wirelessInfo = $null
  }
}

try {
  $volume = [Native]::GetVolumeInfoJson() | ConvertFrom-Json
} catch {
  $volume = [PSCustomObject]@{ level = 0; muted = $false; deviceName = "Unknown"; deviceKind = "speaker" }
}
$result = [PSCustomObject]@{
  network = [PSCustomObject]@{
    connected = $null -ne $adapter
    name = if ($wirelessInfo -and $wirelessInfo.ssid) { $wirelessInfo.ssid } elseif ($adapter) { $adapter.name } else { $null }
    description = if ($adapter) { $adapter.description } else { $null }
    type = if ($adapter) { $adapter.type } else { $null }
    speed = if ($adapter) { $adapter.speed } else { $null }
    gateway = if ($adapter) { $adapter.gateway } else { $null }
    addresses = if ($adapter) { $adapter.addresses } else { @() }
    signalQuality = if ($wirelessInfo) { $wirelessInfo.signalQuality } else { $null }
  }
  volume = $volume
  battery = ([Native]::GetPowerInfoJson() | ConvertFrom-Json)
}

$result | ConvertTo-Json -Depth 6 -Compress
`;

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

function monthShort(now: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(now);
}

function monthLong(now: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(now);
}

function weekdayLong(now: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
}

function withTick(markdown: string, now: Date) {
  return `${markdown}\n\n<!-- tick:${now.getTime()} -->`;
}

function cleanCopiedDetail(markdown: string) {
  return markdown.replace(/\n\n<!-- tick:\d+ -->$/, "");
}

async function fetchSystemSnapshot(): Promise<SystemSnapshot> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-Command", SYSTEM_STATUS_SCRIPT],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    },
  );

  return JSON.parse(stdout.trim()) as SystemSnapshot;
}

function getInternetIcon(snapshot: SystemSnapshot) {
  if (!snapshot.network.connected) return Icon.Signal0;
  if (snapshot.network.type !== "Wireless80211") return Icon.FullSignal;

  const quality = snapshot.network.signalQuality ?? 100;

  if (quality <= 0) return Icon.Signal0;
  if (quality < 25) return Icon.Signal1;
  if (quality < 50) return Icon.Signal2;
  if (quality < 75) return Icon.Signal3;
  return Icon.FullSignal;
}

function getVolumeIcon(snapshot: SystemSnapshot) {
  if (snapshot.volume.deviceKind === "headphones") return Icon.Headphones;
  if (snapshot.volume.muted) return Icon.SpeakerOff;
  if (snapshot.volume.level <= 33) return Icon.SpeakerLow;
  if (snapshot.volume.level <= 66) return Icon.SpeakerOn;
  return Icon.SpeakerHigh;
}

function getBatteryIcon(snapshot: SystemSnapshot) {
  if (!snapshot.battery.available) return Icon.BatteryDisabled;
  if (snapshot.battery.saverOn) return Icon.Leaf;
  if (snapshot.battery.charging) return Icon.BatteryCharging;
  return Icon.Battery;
}

function formatRemainingTime(seconds: number) {
  if (seconds <= 0) return "Unknown";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatTime(now: Date, format: TimeFormat, showSeconds: boolean) {
  const hour24 = now.getHours();
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  if (format === "12h") {
    return showSeconds
      ? `${hour12}:${minute}:${second} ${suffix}`
      : `${hour12}:${minute} ${suffix}`;
  }

  if (format === "24h-short") {
    return showSeconds
      ? `${hour24}:${minute}:${second}`
      : `${hour24}:${minute}`;
  }

  return showSeconds
    ? `${pad(hour24)}:${minute}:${second}`
    : `${pad(hour24)}:${minute}`;
}

function formatDate(now: Date, format: DateFormat) {
  const day = now.getDate();
  const day2 = pad(day);
  const month = now.getMonth() + 1;
  const month2 = pad(month);
  const year4 = now.getFullYear();
  const year2 = String(year4).slice(-2);

  switch (format) {
    case "D/MM/YYYY":
      return `${day}/${month2}/${year4}`;
    case "D/MM/YY":
      return `${day}/${month2}/${year2}`;
    case "D/M/YY":
      return `${day}/${month}/${year2}`;
    case "D/M/YYYY":
      return `${day}/${month}/${year4}`;
    case "DD/MM/YY":
      return `${day2}/${month2}/${year2}`;
    case "DD/MM/YYYY":
      return `${day2}/${month2}/${year4}`;
    case "DD-Mth-YY":
      return `${day2}-${monthShort(now)}-${year2}`;
    case "DD-Month-YYYY":
      return `${day2}-${monthLong(now)}-${year4}`;
    case "YYYY-MM-DD":
      return `${year4}-${month2}-${day2}`;
    case "YY/MM/DD":
      return `${year2}/${month2}/${day2}`;
    case "YYYY/MM/DD":
      return `${year4}/${month2}/${day2}`;
  }
}

function formatDateDetail(now: Date, format: DateDetailFormat) {
  const day = now.getDate();
  const month = monthLong(now);
  const year = now.getFullYear();

  if (format === "D Month YYYY") {
    return `${day} ${month} ${year}`;
  }

  return `${weekdayLong(now)}, ${day} ${month} ${year}`;
}

function buildInternetDetail(snapshot: SystemSnapshot) {
  if (!snapshot.network.connected) {
    return `# Internet

**Status:** Offline`;
  }

  const addresses =
    snapshot.network.addresses.length > 0
      ? snapshot.network.addresses
          .map((address) => `- \`${address}\``)
          .join("\n")
      : "- None";

  return `# Internet

**Network:** ${snapshot.network.name ?? "Unknown"}  
**Status:** Internet Access  
**Type:** ${snapshot.network.type ?? "Unknown"}  
**Gateway:** ${snapshot.network.gateway ?? "Unknown"}  
**Signal Quality:** ${snapshot.network.signalQuality != null ? `${snapshot.network.signalQuality}%` : "Unavailable"}

## Adapter
${snapshot.network.description ?? "Unknown"}

## Addresses
${addresses}`;
}

function buildVolumeDetail(snapshot: SystemSnapshot) {
  return `# Volume

**Level:** ${snapshot.volume.level}%  
**Muted:** ${snapshot.volume.muted ? "Yes" : "No"}  
**Output Device:** ${snapshot.volume.deviceName || "Unknown"}  
**Device Type:** ${snapshot.volume.deviceKind === "headphones" ? "Headphones" : "Speaker"}`;
}

function buildBatteryDetail(snapshot: SystemSnapshot) {
  if (!snapshot.battery.available) {
    return `# Battery

This device does not report a system battery.`;
  }

  return `# Battery

**Charge:** ${snapshot.battery.percentage ?? "Unknown"}%  
**Charging:** ${snapshot.battery.charging ? "Yes" : "No"}  
**Energy Saver:** ${snapshot.battery.saverOn ? "On" : "Off"}  
**Time Remaining:** ${formatRemainingTime(snapshot.battery.remainingSeconds)}`;
}

function buildTimeDetail(now: Date, timeFormat: TimeFormat) {
  return `# Time

**Current Time:** ${formatTime(now, timeFormat, true)}`;
}

function buildDateDetail(now: Date, dateDetailFormat: DateDetailFormat) {
  return `# Date

**Today:** ${formatDateDetail(now, dateDetailFormat)}`;
}

function StaticDetailPage(props: { title: string; markdown: string }) {
  return (
    <Detail
      navigationTitle={props.title}
      markdown={props.markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Details"
            content={cleanCopiedDetail(props.markdown)}
          />
        </ActionPanel>
      }
    />
  );
}

function LiveTimeDetailPage(props: { timeFormat: TimeFormat }) {
  const [now, setNow] = useState(() => new Date());
  const markdown = withTick(buildTimeDetail(now, props.timeFormat), now);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, CLOCK_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <Detail
      navigationTitle="Time"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Details"
            content={cleanCopiedDetail(markdown)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.SystemStatus>();
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const nextSnapshot = await fetchSystemSnapshot();

        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load system status.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    const interval = setInterval(() => void load(), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, CLOCK_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  const fallbackSnapshot: SystemSnapshot = {
    network: { connected: false, addresses: [] },
    volume: {
      level: 0,
      muted: false,
      deviceName: "Unknown",
      deviceKind: "speaker",
    },
    battery: {
      available: false,
      percentage: null,
      charging: false,
      saverOn: false,
      remainingSeconds: -1,
      batteryFlag: 255,
    },
  };

  const currentSnapshot = snapshot ?? fallbackSnapshot;
  const showSeconds = Boolean(preferences.showSeconds);
  const showInlineDetail = preferences.detailViewMode !== "subpage";
  const timeFormat = preferences.timeFormat ?? "12h";
  const dateFormat = preferences.dateFormat ?? "D/MM/YYYY";
  const dateDetailFormat = preferences.dateDetailFormat ?? "Day, D Month YYYY";

  const items: StatusItem[] = [
    {
      id: "internet",
      label: "Internet",
      title: currentSnapshot.network.connected
        ? (currentSnapshot.network.name ?? "Connected")
        : "Not Connected",
      accessory: currentSnapshot.network.connected
        ? "Internet Access"
        : "Offline",
      icon: getInternetIcon(currentSnapshot),
      detail: buildInternetDetail(currentSnapshot),
    },
    {
      id: "volume",
      label: "Volume",
      title: `${currentSnapshot.volume.level}%`,
      accessory: currentSnapshot.volume.deviceName?.trim() || "Unknown",
      icon: getVolumeIcon(currentSnapshot),
      detail: buildVolumeDetail(currentSnapshot),
    },
    {
      id: "battery",
      label: "Battery",
      title: currentSnapshot.battery.available
        ? `${currentSnapshot.battery.percentage ?? "Unknown"}%${currentSnapshot.battery.charging ? " (Charging)" : ""}`
        : "No Battery",
      accessory: "Battery Status",
      icon: getBatteryIcon(currentSnapshot),
      detail: buildBatteryDetail(currentSnapshot),
    },
    {
      id: "time",
      label: "Time",
      title: formatTime(now, timeFormat, showSeconds),
      accessory: "Time",
      icon: Icon.Clock,
      detail: withTick(buildTimeDetail(now, timeFormat), now),
    },
    {
      id: "date",
      label: "Date",
      title: formatDate(now, dateFormat),
      accessory: "Date",
      icon: Icon.Calendar,
      detail: buildDateDetail(now, dateDetailFormat),
    },
  ];

  function renderDetailTarget(item: StatusItem) {
    if (item.id === "time") {
      return <LiveTimeDetailPage timeFormat={timeFormat} />;
    }

    return <StaticDetailPage title={item.label} markdown={item.detail} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={showInlineDetail}>
      {error ? (
        <List.Item
          title="Unable to load system status"
          accessories={[{ text: error }]}
          icon={Icon.Warning}
          detail={
            showInlineDetail ? (
              <List.Item.Detail markdown={`# Error\n\n${error}`} />
            ) : undefined
          }
          actions={
            <ActionPanel>
              {!showInlineDetail ? (
                <Action.Push
                  title="Show Details"
                  target={
                    <StaticDetailPage
                      title="Error"
                      markdown={`# Error\n\n${error}`}
                    />
                  }
                />
              ) : null}
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => setRefreshKey((value) => value + 1)}
              />
              <Action.CopyToClipboard
                title="Copy Details"
                content={`# Error\n\n${error}`}
              />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.label}
            accessories={[{ text: item.accessory }]}
            icon={item.icon}
            detail={
              showInlineDetail ? (
                <List.Item.Detail markdown={item.detail} />
              ) : undefined
            }
            actions={
              <ActionPanel>
                {!showInlineDetail ? (
                  <Action.Push
                    title="Show Details"
                    target={renderDetailTarget(item)}
                  />
                ) : null}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } }}
                  onAction={() => setRefreshKey((value) => value + 1)}
                />
                <Action.CopyToClipboard
                  title="Copy Details"
                  content={cleanCopiedDetail(item.detail)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
