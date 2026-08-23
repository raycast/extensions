<#
.SYNOPSIS
    Per-monitor HDR (advanced color) control via the Win32 DisplayConfig API.

.DESCRIPTION
    Self-contained helper for the "Toggle HDR" Raycast extension. Uses Add-Type to
    P/Invoke user32.dll's DisplayConfig functions so HDR can be read and toggled on a
    single display target instead of globally (which is all Win+Alt+B can do).

    Verbs:
      list                       -> JSON array: [{ id, name, supported, enabled, api }]
      set    -Id <id> -State on  -> enable/disable HDR on one monitor
      toggle -Id <id>            -> invert HDR on one monitor

    On Windows 11 24H2+ it uses the HDR-specific DisplayConfig API (GET_ADVANCED_COLOR_INFO_2
    / SET_HDR_STATE) for accurate HDR state; on older builds it falls back to the legacy
    advanced-color API. The "api" field reports which was used ("hdr" or "advancedColor").

    "id" is the monitor device path (stable across reboots/GPU re-enumeration). The
    volatile adapter LUID is resolved live on every call, never round-tripped through
    the caller.

    On error, prints { "error": "<message>" } to stdout and exits 1.

    This is a per-user display setting and needs no administrator elevation.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Verb = "list",
    [string]$Id,
    [ValidateSet("on", "off")]
    [string]$State
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$source = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class Hdr
{
    [StructLayout(LayoutKind.Sequential)]
    public struct LUID { public uint LowPart; public int HighPart; }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_RATIONAL { public uint Numerator; public uint Denominator; }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_SOURCE_INFO
    {
        public LUID adapterId; public uint id; public uint modeInfoIdx; public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_TARGET_INFO
    {
        public LUID adapterId; public uint id; public uint modeInfoIdx;
        public uint outputTechnology; public uint rotation; public uint scaling;
        public DISPLAYCONFIG_RATIONAL refreshRate; public uint scanLineOrdering;
        public int targetAvailable; public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_INFO
    {
        public DISPLAYCONFIG_PATH_SOURCE_INFO sourceInfo;
        public DISPLAYCONFIG_PATH_TARGET_INFO targetInfo;
        public uint flags;
    }

    // 64 bytes: header (16) + 48-byte mode union. Contents unused; sized for QueryDisplayConfig.
    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_MODE_INFO
    {
        public uint infoType; public uint id; public LUID adapterId;
        public ulong u0; public ulong u1; public ulong u2; public ulong u3; public ulong u4; public ulong u5;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_DEVICE_INFO_HEADER
    {
        public uint type; public uint size; public LUID adapterId; public uint id;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;            // bit0 = supported, bit1 = enabled
        public uint colorEncoding;
        public uint bitsPerColorChannel;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;            // bit0 = enable
    }

    // Windows 11 24H2+ HDR-specific APIs. value bits (from advanced color info 2):
    //   bit0 advancedColorSupported, bit1 advancedColorActive,
    //   bit4 highDynamicRangeSupported (0x10), bit5 highDynamicRangeUserEnabled (0x20).
    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO_2
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;
        public uint colorEncoding;
        public uint bitsPerColorChannel;
        public uint activeColorMode;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_SET_HDR_STATE
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;            // bit0 = enableHdr
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DISPLAYCONFIG_TARGET_DEVICE_NAME
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint flags; public uint outputTechnology;
        public ushort edidManufactureId; public ushort edidProductCodeId; public uint connectorInstance;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string monitorFriendlyDeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string monitorDevicePath;
    }

    const uint QDC_ONLY_ACTIVE_PATHS = 0x00000002;
    const uint GET_TARGET_NAME = 2;
    const uint GET_ADVANCED_COLOR_INFO = 9;
    const uint SET_ADVANCED_COLOR_STATE = 10;
    const uint GET_ADVANCED_COLOR_INFO_2 = 15;   // Windows 11 24H2+
    const uint SET_HDR_STATE = 16;               // Windows 11 24H2+

    const uint HDR_SUPPORTED_BIT = 0x10;         // info2 value bit4
    const uint HDR_ENABLED_BIT = 0x20;           // info2 value bit5

    [DllImport("user32.dll")]
    static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPath, out uint numMode);

    [DllImport("user32.dll")]
    static extern int QueryDisplayConfig(uint flags, ref uint numPath, [Out] DISPLAYCONFIG_PATH_INFO[] pathArray,
        ref uint numMode, [Out] DISPLAYCONFIG_MODE_INFO[] modeArray, IntPtr currentTopologyId);

    [DllImport("user32.dll")]
    static extern int DisplayConfigGetDeviceInfo(ref DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO req);

    [DllImport("user32.dll")]
    static extern int DisplayConfigGetDeviceInfo(ref DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO_2 req);

    [DllImport("user32.dll")]
    static extern int DisplayConfigGetDeviceInfo(ref DISPLAYCONFIG_TARGET_DEVICE_NAME req);

    [DllImport("user32.dll")]
    static extern int DisplayConfigSetDeviceInfo(ref DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE req);

    [DllImport("user32.dll")]
    static extern int DisplayConfigSetDeviceInfo(ref DISPLAYCONFIG_SET_HDR_STATE req);

    public class MonitorInfo
    {
        public string Id; public string Name; public bool Supported; public bool Enabled;
        // Which API reported/should control this target: "hdr" (24H2+) or "advancedColor" (legacy).
        public string Api;
        internal LUID adapterId; internal uint targetId; internal bool useNewApi;
    }

    static List<MonitorInfo> Enumerate()
    {
        uint numPath, numMode;
        int err = GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, out numPath, out numMode);
        if (err != 0) throw new Exception("GetDisplayConfigBufferSizes failed (" + err + ")");

        var paths = new DISPLAYCONFIG_PATH_INFO[numPath];
        var modes = new DISPLAYCONFIG_MODE_INFO[numMode];
        err = QueryDisplayConfig(QDC_ONLY_ACTIVE_PATHS, ref numPath, paths, ref numMode, modes, IntPtr.Zero);
        if (err != 0) throw new Exception("QueryDisplayConfig failed (" + err + ")");

        var result = new List<MonitorInfo>();
        for (uint i = 0; i < numPath; i++)
        {
            var t = paths[i].targetInfo;

            var name = new DISPLAYCONFIG_TARGET_DEVICE_NAME();
            name.header.type = GET_TARGET_NAME;
            name.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_TARGET_DEVICE_NAME));
            name.header.adapterId = t.adapterId;
            name.header.id = t.id;
            string friendly = null, devicePath = null;
            if (DisplayConfigGetDeviceInfo(ref name) == 0)
            {
                friendly = name.monitorFriendlyDeviceName;
                devicePath = name.monitorDevicePath;
            }

            bool supported, enabled, useNewApi;

            // Prefer the HDR-specific API (Windows 11 24H2+). On 24H2 the legacy
            // "advancedColorEnabled" bit can be set for WCG/auto color management even when
            // HDR is off, so the info2 HDR bits give an accurate state. Fall back to the
            // legacy API on older Windows where info2 returns a non-zero error.
            var color2 = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO_2();
            color2.header.type = GET_ADVANCED_COLOR_INFO_2;
            color2.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO_2));
            color2.header.adapterId = t.adapterId;
            color2.header.id = t.id;
            if (DisplayConfigGetDeviceInfo(ref color2) == 0)
            {
                useNewApi = true;
                supported = (color2.value & HDR_SUPPORTED_BIT) != 0;
                enabled = (color2.value & HDR_ENABLED_BIT) != 0;
            }
            else
            {
                var color = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO();
                color.header.type = GET_ADVANCED_COLOR_INFO;
                color.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO));
                color.header.adapterId = t.adapterId;
                color.header.id = t.id;
                if (DisplayConfigGetDeviceInfo(ref color) != 0) continue;
                useNewApi = false;
                // Legacy advancedColorSupported (bit0) is set for both true HDR and
                // wide-color-gamut-only displays. wideColorEnforced (bit2) flags the
                // WCG-only panels that Windows offers no HDR toggle for, so exclude them
                // to match Windows. (The 24H2+ HDR-specific API above avoids this entirely.)
                bool advancedColorSupported = (color.value & 0x1) != 0;
                bool wideColorEnforced = (color.value & 0x4) != 0;
                supported = advancedColorSupported && !wideColorEnforced;
                enabled = (color.value & 0x2) != 0;
            }
            if (!supported) continue;

            var mi = new MonitorInfo();
            mi.Id = string.IsNullOrEmpty(devicePath) ? ("target-" + t.id) : devicePath;
            mi.Name = string.IsNullOrEmpty(friendly) ? ("Display " + t.id) : friendly;
            mi.Supported = supported;
            mi.Enabled = enabled;
            mi.Api = useNewApi ? "hdr" : "advancedColor";
            mi.adapterId = t.adapterId;
            mi.targetId = t.id;
            mi.useNewApi = useNewApi;
            result.Add(mi);
        }
        return result;
    }

    static MonitorInfo Find(string id)
    {
        foreach (var m in Enumerate())
            if (string.Equals(m.Id, id, StringComparison.OrdinalIgnoreCase)) return m;
        throw new Exception("No HDR-capable monitor found for id: " + id);
    }

    public static List<MonitorInfo> List() { return Enumerate(); }

    public static bool SetById(string id, bool enable)
    {
        var target = Find(id);
        uint val = enable ? 1u : 0u;

        // On 24H2+ use the HDR-specific setter; if it fails, fall back to the legacy
        // advanced-color setter (which still works on those builds).
        if (target.useNewApi)
        {
            var setHdr = new DISPLAYCONFIG_SET_HDR_STATE();
            setHdr.header.type = SET_HDR_STATE;
            setHdr.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SET_HDR_STATE));
            setHdr.header.adapterId = target.adapterId;
            setHdr.header.id = target.targetId;
            setHdr.value = val;
            if (DisplayConfigSetDeviceInfo(ref setHdr) == 0) return enable;
        }

        var set = new DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE();
        set.header.type = SET_ADVANCED_COLOR_STATE;
        set.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE));
        set.header.adapterId = target.adapterId;
        set.header.id = target.targetId;
        set.value = val;
        int err = DisplayConfigSetDeviceInfo(ref set);
        if (err != 0) throw new Exception("DisplayConfigSetDeviceInfo failed (" + err + ")");
        return enable;
    }

    public static bool ToggleById(string id)
    {
        var target = Find(id);
        return SetById(id, !target.Enabled);
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'Hdr').Type) {
    Add-Type -TypeDefinition $source -Language CSharp | Out-Null
}

function ConvertTo-MonitorArrayJson($monitors) {
    $items = @($monitors | ForEach-Object {
        [pscustomobject]@{
            id        = $_.Id
            name      = $_.Name
            supported = [bool]$_.Supported
            enabled   = [bool]$_.Enabled
            api       = $_.Api
        }
    })
    # Force a JSON array even for 0/1 elements (PS 5.1 has no -AsArray).
    if ($items.Count -eq 0) { return "[]" }
    if ($items.Count -eq 1) { return "[" + (ConvertTo-Json -InputObject $items[0] -Compress) + "]" }
    return ConvertTo-Json -InputObject $items -Compress
}

try {
    switch ($Verb.ToLowerInvariant()) {
        "list" {
            ConvertTo-MonitorArrayJson ([Hdr]::List())
        }
        "set" {
            if ([string]::IsNullOrEmpty($Id)) { throw "set requires -Id" }
            if ([string]::IsNullOrEmpty($State)) { throw "set requires -State on|off" }
            $enabled = [Hdr]::SetById($Id, ($State -eq "on"))
            [pscustomobject]@{ id = $Id; enabled = [bool]$enabled } | ConvertTo-Json -Compress
        }
        "toggle" {
            if ([string]::IsNullOrEmpty($Id)) { throw "toggle requires -Id" }
            $enabled = [Hdr]::ToggleById($Id)
            [pscustomobject]@{ id = $Id; enabled = [bool]$enabled } | ConvertTo-Json -Compress
        }
        default { throw "Unknown verb '$Verb' (expected list|set|toggle)" }
    }
}
catch {
    # Unwrap PowerShell's MethodInvocationException to the underlying .NET message.
    $ex = $_.Exception
    while ($ex.InnerException) { $ex = $ex.InnerException }
    [pscustomobject]@{ error = $ex.Message } | ConvertTo-Json -Compress
    exit 1
}
