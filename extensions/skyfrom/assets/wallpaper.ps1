$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
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
