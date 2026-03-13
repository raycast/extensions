param (
    [Parameter(Mandatory=$true)]
    [string]$DriveLetter
)

# 1. Clean up drive letter input (ensure "E:" format)
$cleanDrive = $DriveLetter.Substring(0, 1) + ":"

try {
    # 2. Trace relations: LogicalDisk (E:) -> Partition -> Disk Drive (USB Device)
    # Using CIM is safer and faster than legacy WMI
    $logicalDisk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$cleanDrive'"
    
    if (-not $logicalDisk) {
        throw "Drive $cleanDrive not found."
    }

    $partition = $logicalDisk | Get-CimAssociatedInstance -ResultClassName Win32_DiskPartition
    $diskDrive = $partition | Get-CimAssociatedInstance -ResultClassName Win32_DiskDrive
    
    # This ID looks like "USBSTOR\DISK&VEN_SanDisk..."
    $deviceId = $diskDrive.PNPDeviceID

    if ([string]::IsNullOrEmpty($deviceId)) {
        throw "Could not resolve physical device ID for $cleanDrive"
    }

    # 3. Load C# and Eject
    $CsFilePath = Join-Path $PSScriptRoot "USBEjector.cs"

    if (-not ([System.Management.Automation.PSTypeName]'USBEjector').Type) {
        Add-Type -Path $CsFilePath
    }

    # Pass the Disk ID (e.g. USBSTOR\DISK&VEN...)
    # The C# code will automatically find the Parent (USB\VID...) and eject that.
    [USBEjector]::Eject($deviceId)
    Write-Output "Success"
}
catch {
    # Print just the error message so your TypeScript can grab it cleanly
    Write-Error $_.Exception.Message
    exit 1
}
