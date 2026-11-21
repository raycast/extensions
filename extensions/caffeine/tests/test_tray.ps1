Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@

$iconPath = Join-Path $PSScriptRoot "..\assets\icon.png"
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $iconPath).Path)
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = $icon
$tray.Text = "Caffeine (Active)"
$tray.Visible = $true

[System.Windows.Forms.Application]::DoEvents()
Start-Sleep -Seconds 1

$tray.Visible = $false
$tray.Dispose()
$bmp.Dispose()
[WinUtil]::DestroyIcon($hIcon) | Out-Null

Write-Output "SUCCESS"
