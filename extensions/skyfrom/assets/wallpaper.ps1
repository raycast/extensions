$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class SkyFromWallpaper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DisplayMode {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        public ushort SpecVersion, DriverVersion, Size, DriverExtra;
        public uint Fields;
        public int PositionX, PositionY;
        public uint DisplayOrientation, DisplayFixedOutput;
        public short Color, Duplex, YResolution, TTOption, Collate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string FormName;
        public ushort LogPixels;
        public uint BitsPerPixel, Width, Height, DisplayFlags, DisplayFrequency;
        public uint ICMMethod, ICMIntent, MediaType, DitherType, Reserved1, Reserved2, PanningWidth, PanningHeight;
    }

    [DllImport("user32.dll", EntryPoint = "EnumDisplaySettingsW", CharSet = CharSet.Unicode, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumDisplaySettings(string device, int mode, ref DisplayMode display);

    [DllImport("user32.dll", EntryPoint = "SystemParametersInfoW", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SystemParametersInfo(uint action, uint parameter, string path, uint flags);

    [ComImport, Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IDesktopWallpaper {
        void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitor, [MarshalAs(UnmanagedType.LPWStr)] string path);
        void GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitor, [MarshalAs(UnmanagedType.LPWStr)] out string path);
        void GetMonitorDevicePathAt(uint index, [MarshalAs(UnmanagedType.LPWStr)] out string monitor);
        void GetMonitorDevicePathCount(out uint count);
    }

    public static string[] MonitorWallpapers() {
        var classId = new Guid("C2CF3110-460E-4FC1-B9D0-8A1C0C9CC4BD");
        var wallpaper = (IDesktopWallpaper)Activator.CreateInstance(Type.GetTypeFromCLSID(classId));
        try {
            uint count;
            wallpaper.GetMonitorDevicePathCount(out count);
            if (count == 0) throw new InvalidOperationException("WALLPAPER_REFERENCES_UNAVAILABLE");
            var paths = new List<string>();
            for (uint i = 0; i < count; i++) {
                string monitor, path;
                wallpaper.GetMonitorDevicePathAt(i, out monitor);
                wallpaper.GetWallpaper(monitor, out path);
                if (!String.IsNullOrEmpty(path)) paths.Add(path);
            }
            return paths.ToArray();
        } finally {
            Marshal.ReleaseComObject(wallpaper);
        }
    }

    public static DisplayMode CurrentDisplay() {
        const int EnumCurrentSettings = -1;
        var display = new DisplayMode();
        display.Size = (ushort)Marshal.SizeOf(typeof(DisplayMode));
        if (!EnumDisplaySettings(null, EnumCurrentSettings, ref display))
            throw new InvalidOperationException("NO_SCREEN");
        return display;
    }

    public static void Apply(string path) {
        const uint SetDesktopWallpaper = 0x0014;
        const uint UpdateUserProfile = 0x0001;
        const uint BroadcastChange = 0x0002;
        if (SystemParametersInfo(SetDesktopWallpaper, 0, path, UpdateUserProfile | BroadcastChange))
            return;
        if (Marshal.GetLastWin32Error() == 5)
            throw new UnauthorizedAccessException("PERMISSION_DENIED");
        throw new InvalidOperationException("APPLY_FAILED");
    }
}
'@

if ($env:SKYFROM_WALLPAPER_OP -eq 'inspect') {
    # EnumDisplaySettingsW reports physical pixels independently of Windows scaling.
    $display = [SkyFromWallpaper]::CurrentDisplay()
    @{ width = $display.Width; height = $display.Height } | ConvertTo-Json -Compress
    return
}

if ($env:SKYFROM_WALLPAPER_OP -eq 'references') {
    $explorer = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer'
    $virtualDesktops = "$explorer\VirtualDesktops"
    $desktops = "$virtualDesktops\Desktops"
    $keys = @(Get-Item -LiteralPath 'HKCU:\Control Panel\Desktop')
    if (Test-Path -LiteralPath "$explorer\Wallpapers") {
        $keys += Get-Item -LiteralPath "$explorer\Wallpapers"
    }

    # Inactive Windows 11 virtual desktops store their own wallpaper path.
    if (Test-Path -LiteralPath $virtualDesktops) {
        $desktopIds = (Get-Item -LiteralPath $virtualDesktops).GetValue('VirtualDesktopIDs')
        if (Test-Path -LiteralPath $desktops) {
            $keys += @(Get-ChildItem -LiteralPath $desktops)
        } elseif ($desktopIds -is [byte[]] -and $desktopIds.Length -gt 16) {
            throw 'WALLPAPER_REFERENCES_UNAVAILABLE'
        }
    }

    $paths = @([SkyFromWallpaper]::MonitorWallpapers())
    foreach ($key in $keys) {
        foreach ($name in $key.GetValueNames()) {
            $value = $key.GetValue($name)
            if ($value -is [byte[]]) {
                # TranscodedImageCache can retain the source path in UTF-16.
                $paths += [Text.Encoding]::Unicode.GetString($value)
            } elseif ($value -is [string] -or $value -is [string[]]) {
                $paths += $value
            }
        }
    }

    $files = foreach ($path in $paths) {
        foreach ($match in [regex]::Matches($path, '(?i)[a-f0-9]{64}\.png')) {
            $match.Value.ToLowerInvariant()
        }
    }
    ConvertTo-Json -InputObject @($files | Sort-Object -Unique) -Compress
    return
}

$path = $env:SKYFROM_WALLPAPER_IMAGE
if ($env:SKYFROM_WALLPAPER_OP -ne 'apply' -or !$path) {
    throw 'INVALID_ARGUMENTS'
}

Add-Type -AssemblyName System.Drawing
$image = $null
try {
    $image = [System.Drawing.Image]::FromFile($path, $true)
    if ($image.RawFormat.Guid -ne [System.Drawing.Imaging.ImageFormat]::Png.Guid) {
        throw 'Expected PNG'
    }
    $bitmap = [System.Drawing.Bitmap]::new($image)
    $bitmap.Dispose()
} catch {
    throw 'INVALID_IMAGE'
} finally {
    if ($image) { $image.Dispose() }
}

[SkyFromWallpaper]::Apply($path)
'{"applied":true}'
