param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("list", "set", "volume", "mute")]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [ValidateSet("output", "input")]
  [string]$Flow,

  [string]$Id = "",
  [string]$Level = "",
  [string]$Muted = "",
  [string]$Role = "all",
  [string]$CacheDir = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# PowerShell 5.1 writes UTF-16 when stdout is a pipe. Force UTF-8 so Node can parse it.
$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$source = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AudioCtl {
    const int Active = 1;
    const int ClsCtxAll = 23;
    const int VtLpWstr = 31;
    const int VtBstr = 8;

    [DllImport("ole32.dll")]
    static extern int PropVariantClear(ref PropVariant pvar);

    public static string Run(string action, string flowName, string id, string level, string muted, string role) {
        int flow = flowName == "input" ? 1 : 0;
        try {
            if (action == "list") return List(flow);
            if (action == "set") return Set(flow, id, role);
            if (action == "volume") return Volume(flow, id, level);
            if (action == "mute") return Mute(flow, id, muted);
            return Error("Unknown action");
        } catch (Exception ex) {
            return Error(ex.Message);
        }
    }

    static string List(int flow) {
        IMMDeviceEnumerator enumerator = Enumerator();
        string multimediaId = DefaultId(enumerator, flow, 1);
        string communicationsId = DefaultId(enumerator, flow, 2);
        IMMDeviceCollection collection;
        int hr = enumerator.EnumAudioEndpoints(flow, Active, out collection);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);

        uint count;
        hr = collection.GetCount(out count);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);

        StringBuilder json = new StringBuilder();
        json.Append("{\"devices\":[");
        bool first = true;
        for (uint i = 0; i < count; i++) {
            IMMDevice device;
            if (collection.Item(i, out device) < 0) continue;
            string deviceId = DeviceId(device);
            if (deviceId.Length == 0) continue;
            if (!first) json.Append(",");
            first = false;
            AppendDevice(json, device, deviceId, multimediaId, communicationsId);
        }
        json.Append("]}");
        return json.ToString();
    }

    static string Set(int flow, string id, string role) {
        if (id == null || id.Length == 0) return Error("Missing device id");
        IMMDevice device = Find(flow, id);
        if (device == null) return Error("Device not found");
        string deviceId = DeviceId(device);
        IPolicyConfig policy = (IPolicyConfig)new PolicyConfigClient();
        int[] roles = Roles(role);
        for (int i = 0; i < roles.Length; i++) {
            int hr = policy.SetDefaultEndpoint(deviceId, roles[i]);
            if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        }
        return Ok(device, deviceId);
    }

    static string Volume(int flow, string id, string level) {
        IMMDevice device = Find(flow, id);
        if (device == null) return Error("Device not found");
        int percent;
        if (!int.TryParse(level, out percent) || percent < 0 || percent > 100) {
            return Error("Volume must be between 0 and 100");
        }
        IAudioEndpointVolume volume = VolumeOf(device);
        if (volume == null) return Error("This device has no volume control");
        Guid ctx = Guid.Empty;
        int hr = volume.SetMasterVolumeLevelScalar(percent / 100f, ref ctx);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        return Ok(device, DeviceId(device));
    }

    static string Mute(int flow, string id, string muted) {
        IMMDevice device = Find(flow, id);
        if (device == null) return Error("Device not found");
        IAudioEndpointVolume volume = VolumeOf(device);
        if (volume == null) return Error("This device has no mute control");
        bool next;
        if (muted == "toggle") {
            bool current;
            int read = volume.GetMute(out current);
            if (read < 0) Marshal.ThrowExceptionForHR(read);
            next = !current;
        } else {
            next = muted == "true" || muted == "1";
        }
        Guid ctx = Guid.Empty;
        int hr = volume.SetMute(next, ref ctx);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        return Ok(device, DeviceId(device));
    }

    static string Ok(IMMDevice device, string deviceId) {
        IMMDeviceEnumerator enumerator = Enumerator();
        string multimediaId = DefaultId(enumerator, FlowOf(deviceId), 1);
        string communicationsId = DefaultId(enumerator, FlowOf(deviceId), 2);
        StringBuilder json = new StringBuilder();
        json.Append("{\"ok\":true,\"device\":");
        AppendDevice(json, device, deviceId, multimediaId, communicationsId);
        json.Append("}");
        return json.ToString();
    }

    static int FlowOf(string deviceId) {
        return deviceId != null && deviceId.IndexOf("{0.0.1.") == 0 ? 1 : 0;
    }

    static int[] Roles(string role) {
        if (role == "communications") return new int[] { 2 };
        if (role == "multimedia") return new int[] { 1 };
        if (role == "console") return new int[] { 0 };
        if (role == "playback") return new int[] { 0, 1 };
        return new int[] { 0, 1, 2 };
    }

    static void AppendDevice(StringBuilder json, IMMDevice device, string deviceId, string multimediaId, string communicationsId) {
        string name = ReadName(device);
        int? volume = ReadVolume(device);
        bool? muted = ReadMuted(device);
        json.Append("{\"id\":\"").Append(Esc(deviceId)).Append("\"");
        json.Append(",\"name\":\"").Append(Esc(name)).Append("\"");
        if (volume.HasValue) json.Append(",\"volume\":").Append(volume.Value.ToString());
        else json.Append(",\"volume\":null");
        if (muted.HasValue) json.Append(",\"muted\":").Append(muted.Value ? "true" : "false");
        else json.Append(",\"muted\":null");
        json.Append(",\"default\":").Append(deviceId == multimediaId ? "true" : "false");
        json.Append(",\"communications\":").Append(deviceId == communicationsId ? "true" : "false");
        json.Append("}");
    }

    static IMMDevice Find(int flow, string id) {
        IMMDeviceEnumerator enumerator = Enumerator();
        IMMDevice direct;
        if (enumerator.GetDevice(id, out direct) >= 0 && direct != null) return direct;

        IMMDeviceCollection collection;
        if (enumerator.EnumAudioEndpoints(flow, Active, out collection) < 0) return null;
        uint count;
        if (collection.GetCount(out count) < 0) return null;
        string needle = id.ToLowerInvariant();
        IMMDevice match = null;
        for (uint i = 0; i < count; i++) {
            IMMDevice device;
            if (collection.Item(i, out device) < 0) continue;
            string deviceId = DeviceId(device);
            string name = ReadName(device).ToLowerInvariant();
            if (deviceId == id || name == needle || name.IndexOf(needle) >= 0) {
                if (match != null) return null;
                match = device;
            }
        }
        return match;
    }

    static IMMDeviceEnumerator Enumerator() {
        return (IMMDeviceEnumerator)new MMDeviceEnumerator();
    }

    static string DefaultId(IMMDeviceEnumerator enumerator, int flow, int role) {
        IMMDevice device;
        int hr = enumerator.GetDefaultAudioEndpoint(flow, role, out device);
        if (hr < 0 || device == null) return "";
        return DeviceId(device);
    }

    static string DeviceId(IMMDevice device) {
        string id;
        if (device.GetId(out id) < 0 || id == null) return "";
        return id;
    }

    static string ReadName(IMMDevice device) {
        string friendly = ReadProp(device, "a45c254e-df1c-4efd-8020-67d146a850e0", 14);
        if (friendly.Length > 0) return friendly;
        string desc = ReadProp(device, "a45c254e-df1c-4efd-8020-67d146a850e0", 2);
        if (desc.Length > 0) return desc;
        return "Unknown device";
    }

    static string ReadProp(IMMDevice device, string fmtid, uint pid) {
        IPropertyStore store;
        if (device.OpenPropertyStore(0, out store) < 0 || store == null) return "";
        PropertyKey key = new PropertyKey();
        key.fmtid = new Guid(fmtid);
        key.pid = pid;
        PropVariant value;
        int hr = store.GetValue(ref key, out value);
        if (hr < 0) return "";
        string text = "";
        if (value.p != IntPtr.Zero && (value.vt == VtLpWstr || value.vt == VtBstr)) {
            text = Marshal.PtrToStringUni(value.p) ?? "";
        }
        PropVariantClear(ref value);
        return text;
    }

    static IAudioEndpointVolume VolumeOf(IMMDevice device) {
        Guid iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
        IntPtr ptr;
        int hr = device.Activate(ref iid, ClsCtxAll, IntPtr.Zero, out ptr);
        if (hr < 0 || ptr == IntPtr.Zero) return null;
        object obj = Marshal.GetObjectForIUnknown(ptr);
        Marshal.Release(ptr);
        return obj as IAudioEndpointVolume;
    }

    static int? ReadVolume(IMMDevice device) {
        IAudioEndpointVolume volume = VolumeOf(device);
        if (volume == null) return null;
        float scalar;
        if (volume.GetMasterVolumeLevelScalar(out scalar) < 0) return null;
        if (scalar < 0f) scalar = 0f;
        if (scalar > 1f) scalar = 1f;
        return (int)Math.Round(scalar * 100f);
    }

    static bool? ReadMuted(IMMDevice device) {
        IAudioEndpointVolume volume = VolumeOf(device);
        if (volume == null) return null;
        bool muted;
        if (volume.GetMute(out muted) < 0) return null;
        return muted;
    }

    static string Error(string message) {
        return "{\"error\":\"" + Esc(message) + "\"}";
    }

    static string Esc(string value) {
        if (value == null) return "";
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PropertyKey {
        public Guid fmtid;
        public uint pid;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PropVariant {
        public ushort vt;
        public ushort r1;
        public ushort r2;
        public ushort r3;
        public IntPtr p;
        public int extra;
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumerator {}

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
        [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
        [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
    }

    [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceCollection {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int Item(uint index, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, out IntPtr iface);
        [PreserveSig] int OpenPropertyStore(int access, out IPropertyStore store);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out int state);
    }

    [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPropertyStore {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int GetAt(uint index, out PropertyKey key);
        [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
        [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant value);
        [PreserveSig] int Commit();
    }

    [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
        [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
        [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
        [PreserveSig] int GetChannelCount(out uint count);
        [PreserveSig] int SetMasterVolumeLevel(float level, ref Guid ctx);
        [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid ctx);
        [PreserveSig] int GetMasterVolumeLevel(out float level);
        [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
        [PreserveSig] int SetChannelVolumeLevel(uint channel, float level, ref Guid ctx);
        [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid ctx);
        [PreserveSig] int GetChannelVolumeLevel(uint channel, out float level);
        [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);
        [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
        [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
    }

    [ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
    class PolicyConfigClient {}

    [ComImport, Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPolicyConfig {
        [PreserveSig] int GetMixFormat();
        [PreserveSig] int GetDeviceFormat();
        [PreserveSig] int ResetDeviceFormat();
        [PreserveSig] int SetDeviceFormat();
        [PreserveSig] int GetProcessingPeriod();
        [PreserveSig] int SetProcessingPeriod();
        [PreserveSig] int GetShareMode();
        [PreserveSig] int SetShareMode();
        [PreserveSig] int GetPropertyValue();
        [PreserveSig] int SetPropertyValue();
        [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string deviceId, int role);
        [PreserveSig] int SetEndpointVisibility();
    }
}
'@

if ([string]::IsNullOrWhiteSpace($CacheDir)) {
  $CacheDir = Join-Path $env:TEMP "rcst-audio-devices"
}

$dll = Join-Path $CacheDir "audio-devices-v2.dll"

function Get-AudioDll {
  param(
    [string]$Dir,
    [string]$Destination,
    [string]$Code,
    [switch]$Rebuild
  )

  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  $mutex = New-Object System.Threading.Mutex($false, "Local\RCSTAudioDevicesV2")
  $held = $false
  try {
    try {
      $held = $mutex.WaitOne(20000)
    } catch [System.Threading.AbandonedMutexException] {
      $held = $true
    }
    if (-not $held) {
      throw "Timed out waiting to build the audio helper"
    }

    if ($Rebuild) {
      Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $Destination) {
      return
    }

    $tmp = Join-Path $Dir ("audio-devices-v2." + [guid]::NewGuid().ToString("n") + ".dll")
    try {
      Add-Type -TypeDefinition $Code -OutputAssembly $tmp -OutputType Library
      Move-Item -LiteralPath $tmp -Destination $Destination -Force
    } finally {
      if (Test-Path -LiteralPath $tmp) {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
      }
    }
  } finally {
    if ($held) {
      $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
  }
}

try {
  Get-AudioDll -Dir $CacheDir -Destination $dll -Code $source
  try {
    Add-Type -Path $dll
  } catch {
    Get-AudioDll -Dir $CacheDir -Destination $dll -Code $source -Rebuild
    Add-Type -Path $dll
  }

  $json = [AudioCtl]::Run($Action, $Flow, $Id, $Level, $Muted, $Role)
  if ($json.StartsWith('{"error":')) {
    [Console]::Error.WriteLine($json)
    exit 1
  }
  [Console]::Out.WriteLine($json)
} catch {
  $message = $_.Exception.Message
  if ([string]::IsNullOrWhiteSpace($message)) { $message = "Audio helper failed" }
  $message = $message -replace '[\r\n"]', ' '
  [Console]::Error.WriteLine(('{"error":"' + $message + '"}'))
  exit 1
}
