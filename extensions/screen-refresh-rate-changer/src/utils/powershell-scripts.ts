/**
 * PowerShell scripts for display management
 */

/**
 * Script to get all displays information
 */
export const GET_DISPLAYS_SCRIPT = `
  # Get all display devices and their current settings
  Add-Type -AssemblyName System.Windows.Forms
  
  # Use WMI to get display information
  $displays = Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams
  
  $result = @()
  $index = 0
  
  foreach ($display in $displays) {
      # Get screen info from System.Windows.Forms
      $screens = [System.Windows.Forms.Screen]::AllScreens
      $screen = $screens[$index]
      
      $displayInfo = @{
          Index = $index
          InstanceName = $display.InstanceName
          Active = $display.Active
          IsPrimary = if ($screen) { $screen.Primary } else { $false }
          DeviceName = if ($screen) { $screen.DeviceName } else { "Unknown" }
      }
      $result += $displayInfo
      $index++
  }
  
  # Return JSON formatted output
  $result | ConvertTo-Json -Compress
`;

/**
 * Script to get available refresh rates for a display
 */
export function getAvailableRefreshRatesScript(displayIndex: number): string {
  return `
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::AllScreens[${displayIndex}]
    
    # Define EnumDisplaySettings to enumerate all display modes
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Collections.Generic;
    
    public class DisplayModeHelper {
        [DllImport("user32.dll")]
        public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
        
        [StructLayout(LayoutKind.Sequential)]
        public struct DEVMODE {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public int dmDisplayOrientation;
            public int dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmDisplayFlags;
            public int dmDisplayFrequency;
        }
        
        public static List<int> GetRefreshRates(string deviceName) {
            var refreshRates = new HashSet<int>();
            var devMode = new DEVMODE();
            devMode.dmSize = (short)Marshal.SizeOf(devMode);
            int modeNum = 0;
            
            // Enumerate all display modes
            while (EnumDisplaySettings(deviceName, modeNum, ref devMode)) {
                if (devMode.dmDisplayFrequency > 0) {
                    refreshRates.Add(devMode.dmDisplayFrequency);
                }
                modeNum++;
            }
            
            return new List<int>(refreshRates);
        }
    }
"@
    
    # Get all refresh rates for the display
    $rates = [DisplayModeHelper]::GetRefreshRates($screen.DeviceName)
    
    # Sort and output as JSON array
    $sortedRates = $rates | Sort-Object
    $sortedRates | ConvertTo-Json -Compress
  `;
}

/**
 * Script to get current refresh rate for a display
 */
export function getCurrentRefreshRateScript(displayIndex: number): string {
  return `
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::AllScreens[${displayIndex}]
    
    # Get current display mode using EnumDisplaySettings
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    
    public class DisplayHelper {
        [DllImport("user32.dll")]
        public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
        
        [StructLayout(LayoutKind.Sequential)]
        public struct DEVMODE {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public int dmDisplayOrientation;
            public int dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmDisplayFlags;
            public int dmDisplayFrequency;
        }
    }
"@
    
    $devMode = New-Object DisplayHelper+DEVMODE
    $devMode.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($devMode)
    
    $result = [DisplayHelper]::EnumDisplaySettings($screen.DeviceName, -1, [ref]$devMode)
    
    if ($result) {
        Write-Host $devMode.dmDisplayFrequency
    } else {
        Write-Host "60"
    }
  `;
}

/**
 * Script to change refresh rate for a display
 */
export function changeRefreshRateScript(displayIndex: number, refreshRate: number): string {
  return `
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::AllScreens[${displayIndex}]
    
    # Define DEVMODE and ChangeDisplaySettingsEx
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    
    public class DisplayChanger {
        [DllImport("user32.dll")]
        public static extern int ChangeDisplaySettingsEx(
            string lpszDeviceName,
            ref DEVMODE lpDevMode,
            IntPtr hwnd,
            uint dwflags,
            IntPtr lParam);
            
        [DllImport("user32.dll")]
        public static extern bool EnumDisplaySettings(
            string deviceName,
            int modeNum,
            ref DEVMODE devMode);
        
        [StructLayout(LayoutKind.Sequential)]
        public struct DEVMODE {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public int dmDisplayOrientation;
            public int dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmDisplayFlags;
            public int dmDisplayFrequency;
        }
        
        public const int DM_DISPLAYFREQUENCY = 0x400000;
        public const int CDS_UPDATEREGISTRY = 0x01;
        public const int CDS_TEST = 0x02;
        public const int DISP_CHANGE_SUCCESSFUL = 0;
        public const int DISP_CHANGE_RESTART = 1;
        public const int DISP_CHANGE_FAILED = -1;
    }
"@
    
    # Get current display settings
    $devMode = New-Object DisplayChanger+DEVMODE
    $devMode.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($devMode)
    
    # Get current settings
    $result = [DisplayChanger]::EnumDisplaySettings($screen.DeviceName, -1, [ref]$devMode)
    
    if (-not $result) {
        Write-Error "Failed to get current display settings"
        exit 1
    }
    
    # Modify only the refresh rate
    $devMode.dmDisplayFrequency = ${refreshRate}
    $devMode.dmFields = [DisplayChanger]::DM_DISPLAYFREQUENCY
    
    # Test the change first
    $testResult = [DisplayChanger]::ChangeDisplaySettingsEx(
        $screen.DeviceName,
        [ref]$devMode,
        [IntPtr]::Zero,
        [DisplayChanger]::CDS_TEST,
        [IntPtr]::Zero
    )
    
    if ($testResult -ne [DisplayChanger]::DISP_CHANGE_SUCCESSFUL) {
        Write-Error "Refresh rate ${refreshRate}Hz is not supported"
        exit 1
    }
    
    # Apply the change
    $changeResult = [DisplayChanger]::ChangeDisplaySettingsEx(
        $screen.DeviceName,
        [ref]$devMode,
        [IntPtr]::Zero,
        [DisplayChanger]::CDS_UPDATEREGISTRY,
        [IntPtr]::Zero
    )
    
    if ($changeResult -eq [DisplayChanger]::DISP_CHANGE_SUCCESSFUL) {
        Write-Host "SUCCESS"
    } else {
        Write-Error "Failed to change refresh rate. Error code: $changeResult"
        exit 1
    }
  `;
}
