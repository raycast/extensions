<#
.SYNOPSIS
    Toggles Theme and returns a JSON payload for Raycast.
.OUTPUTS
    JSON String: { "success": boolean, "title": string, "message": string }
#>

$ErrorActionPreference = "Stop"
$Response = @{ success = $true; title = ""; message = "" }

try {
    # --- 1. COMPILE NATIVE HELPER ---
    try {
        if (-not ([System.Management.Automation.PSTypeName]'NativeMethods').Type) {
            $Source = @'
            using System;
            using System.Runtime.InteropServices;
            public class NativeMethods {
                public const int HWND_BROADCAST = 0xffff;
                public const int WM_SETTINGCHANGE = 0x001A;
                public const int WM_THEMECHANGED = 0x031A;
                public const int SMTO_ABORTIFHUNG = 0x0002;
                [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
                public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
                
                public static bool NotifyWindows() {
                    UIntPtr result;
                    IntPtr s1 = SendMessageTimeout((IntPtr)HWND_BROADCAST, (uint)WM_SETTINGCHANGE, UIntPtr.Zero, "ImmersiveColorSet", (uint)SMTO_ABORTIFHUNG, 2000, out result);
                    IntPtr s2 = SendMessageTimeout((IntPtr)HWND_BROADCAST, (uint)WM_THEMECHANGED, UIntPtr.Zero, null, (uint)SMTO_ABORTIFHUNG, 2000, out result);
                    return (s1 != IntPtr.Zero && s2 != IntPtr.Zero);
                }
            }
'@
            Add-Type -TypeDefinition $Source -Language CSharp
        }
    }
    catch {
        throw "Could not compile the native Windows helper. Check PowerShell permissions."
    }

    # --- 2. REGISTRY LOGIC ---
    $RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    try {
        $Current = Get-ItemProperty -Path $RegPath -Name "SystemUsesLightTheme"
        $IsLight = ($Current.SystemUsesLightTheme -eq 1)
        
        $TargetVal = if ($IsLight) { 0 } else { 1 }
        $TargetName = if ($IsLight) { "Dark" } else { "Light" }

        Set-ItemProperty -Path $RegPath -Name "SystemUsesLightTheme" -Value $TargetVal -Type DWord -Force
        Set-ItemProperty -Path $RegPath -Name "AppsUseLightTheme" -Value $TargetVal -Type DWord -Force
    }
    catch {
        throw "Failed to read or write Registry keys. Access Denied?"
    }

    # --- 3. BROADCAST LOGIC ---
    $broadcastSuccess = [NativeMethods]::NotifyWindows()
    if (-not $broadcastSuccess) {
        # We don't throw here because the theme *did* technically change, just didn't refresh
        $Response.success = $false
        $Response.title = "Partial Success"
        $Response.message = "Theme changed to $TargetName, but UI failed to refresh automatically."
    } else {
        $Response.title = "Theme Toggled"
        $Response.message = "Switched to $TargetName Mode"
    }

}
catch {
    # CATCH-ALL: Any error above jumps here
    $Response.success = $false
    $Response.title = "Theme Error"
    $Response.message = $_.Exception.Message
}

# --- 4. RETURN JSON TO RAYCAST ---
# -Compress removes newlines so it's easier to parse
$Response | ConvertTo-Json -Compress