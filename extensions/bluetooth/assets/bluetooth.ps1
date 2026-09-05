#Requires -Version 5.1
<#
  Bluetooth bridge for the Raycast extension. Emits a single JSON object on stdout,
  or { "error": "..." } with exit code 1.

    status     -> { radio }
    list       -> { radio, devices: [{ address, name, connected, connectable }] }
    on | off   -> { radio }
    connect    -> { ok }   requires -Address (12 hex chars)
    disconnect -> { ok }   requires -Address

  Listing goes through WinRT so it covers both Classic and LE devices. Connecting
  goes through the Win32 Bluetooth API, which is Classic-only; LE peripherals are
  reported as connectable:false and left for Windows to manage.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('status', 'list', 'on', 'off', 'connect', 'disconnect')][string]$Action,
  [ValidatePattern('^[0-9A-Fa-f]{12}$')][string]$Address
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# IAsyncOperation<T> has no synchronous wait, so borrow the AsTask<T> extension via reflection.
$AsTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

function Await($operation, [type]$result) {
  $task = $AsTask.MakeGenericMethod($result).Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  $task.Result
}

[Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null

function Get-Radio {
  $access = Await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
  if ($access -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) {
    throw "Radio access denied ($access). Allow it under Settings > Privacy > Radios."
  }
  $radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $bluetooth = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth } | Select-Object -First 1
  if (-not $bluetooth) { throw 'No Bluetooth radio found.' }
  $bluetooth
}

function Set-Radio([Windows.Devices.Radios.RadioState]$State) {
  $status = Await ((Get-Radio).SetStateAsync($State)) ([Windows.Devices.Radios.RadioAccessStatus])
  if ($status -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Could not change the radio state ($status)." }
}

function Get-Devices {
  # Classic is enumerated first so that on a dual-mode collision its (connectable) row wins.
  $byAddress = [ordered]@{}
  foreach ($classic in $true, $false) {
    $selector = if ($classic) { [Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromPairingState($true) }
    else { [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromPairingState($true) }

    $found = Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)) ([Windows.Devices.Enumeration.DeviceInformationCollection])

    foreach ($info in $found) {
      $device = if ($classic) { Await ([Windows.Devices.Bluetooth.BluetoothDevice]::FromIdAsync($info.Id)) ([Windows.Devices.Bluetooth.BluetoothDevice]) }
      else { Await ([Windows.Devices.Bluetooth.BluetoothLEDevice]::FromIdAsync($info.Id)) ([Windows.Devices.Bluetooth.BluetoothLEDevice]) }
      if (-not $device) { continue }

      $address = '{0:X12}' -f $device.BluetoothAddress
      $connected = $device.ConnectionStatus -eq [Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected
      $device.Dispose()

      # Dual-mode devices appear on both transports; keep one row, connected if either is.
      if ($byAddress.Contains($address)) {
        $byAddress[$address].connected = $byAddress[$address].connected -or $connected
        continue
      }
      $byAddress[$address] = [pscustomobject]@{
        address     = $address
        name        = $info.Name
        connected   = $connected
        connectable = $classic
      }
    }
  }
  , @($byAddress.Values)
}

# Only compiled when a connect/disconnect is actually requested (~500ms).
function Import-Win32Bluetooth {
  if ('Win32Bluetooth' -as [type]) { return }
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Threading;

public static class Win32Bluetooth {
    const uint SUCCESS = 0;
    const uint ERROR_SERVICE_DOES_NOT_EXIST = 1060;

    // Profiles worth enabling to bring a device up. Unsupported ones fail instantly
    // with ERROR_SERVICE_DOES_NOT_EXIST, so listing extras costs nothing.
    static readonly Guid[] Profiles = {
        new Guid("0000110a-0000-1000-8000-00805f9b34fb"), // A2DP source
        new Guid("0000110b-0000-1000-8000-00805f9b34fb"), // A2DP sink
        new Guid("0000110c-0000-1000-8000-00805f9b34fb"), // AVRCP target
        new Guid("0000110e-0000-1000-8000-00805f9b34fb"), // AVRCP controller
        new Guid("00001108-0000-1000-8000-00805f9b34fb"), // Headset
        new Guid("0000111e-0000-1000-8000-00805f9b34fb"), // Hands-free
        new Guid("00001124-0000-1000-8000-00805f9b34fb"), // HID
    };

    // BLUETOOTH_MAX_NAME_SIZE is 248, making this struct 560 bytes. The API validates
    // dwSize strictly and quietly returns nothing when it disagrees.
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct DeviceInfo {
        public int dwSize;
        public ulong Address;
        public uint ulClassofDevice;
        [MarshalAs(UnmanagedType.Bool)] public bool fConnected;
        [MarshalAs(UnmanagedType.Bool)] public bool fRemembered;
        [MarshalAs(UnmanagedType.Bool)] public bool fAuthenticated;
        public ulong lastSeenLow, lastSeenHigh, lastUsedLow, lastUsedHigh;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 248)] public string szName;
    }

    [StructLayout(LayoutKind.Sequential)] struct FindRadioParams { public int dwSize; }

    [DllImport("bthprops.cpl", SetLastError = true)] static extern IntPtr BluetoothFindFirstRadio(ref FindRadioParams p, out IntPtr radio);
    [DllImport("bthprops.cpl")] static extern bool BluetoothFindRadioClose(IntPtr find);
    [DllImport("bthprops.cpl")] static extern uint BluetoothGetDeviceInfo(IntPtr radio, ref DeviceInfo info);
    [DllImport("bthprops.cpl")] static extern uint BluetoothEnumerateInstalledServices(IntPtr radio, ref DeviceInfo info, ref uint count, [Out] Guid[] services);
    [DllImport("bthprops.cpl")] static extern uint BluetoothSetServiceState(IntPtr radio, ref DeviceInfo info, ref Guid service, uint flags);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);

    static DeviceInfo Lookup(IntPtr radio, ulong address) {
        var info = new DeviceInfo { dwSize = Marshal.SizeOf(typeof(DeviceInfo)), Address = address };
        uint code = BluetoothGetDeviceInfo(radio, ref info);
        if (code != SUCCESS) throw new InvalidOperationException("Device is not paired.");
        return info;
    }

    static Guid[] InstalledServices(IntPtr radio, ulong address) {
        var info = Lookup(radio, address);
        uint count = 32;
        var buffer = new Guid[count];
        uint code = BluetoothEnumerateInstalledServices(radio, ref info, ref count, buffer);
        if (code != SUCCESS) throw new Win32Exception((int)code);
        var services = new Guid[count];
        Array.Copy(buffer, services, (int)count);
        return services;
    }

    /// <summary>
    /// Connecting enables the known profiles; disconnecting disables whatever is installed.
    /// Each call blocks for ~3s inside the driver, so they are issued in parallel.
    /// </summary>
    public static void SetConnected(ulong address, bool connect) {
        var findParams = new FindRadioParams { dwSize = Marshal.SizeOf(typeof(FindRadioParams)) };
        IntPtr radio;
        IntPtr find = BluetoothFindFirstRadio(ref findParams, out radio);
        if (find == IntPtr.Zero) throw new InvalidOperationException("No Bluetooth radio found.");

        try {
            Guid[] services = connect ? Profiles : InstalledServices(radio, address);
            if (services.Length == 0) return; // Disconnecting something already down.

            var codes = new uint[services.Length];
            var workers = new Thread[services.Length];
            for (int i = 0; i < services.Length; i++) {
                int index = i;
                workers[index] = new Thread(delegate() {
                    var info = Lookup(radio, address);
                    codes[index] = BluetoothSetServiceState(radio, ref info, ref services[index], connect ? 1u : 0u);
                });
                workers[index].Start();
            }
            foreach (var worker in workers) worker.Join();

            foreach (uint code in codes) if (code == SUCCESS) return;

            foreach (uint code in codes)
                if (code != ERROR_SERVICE_DOES_NOT_EXIST) throw new Win32Exception((int)code);
            throw new InvalidOperationException("Device supports no profile this extension can connect.");
        } finally {
            BluetoothFindRadioClose(find);
            CloseHandle(radio);
        }
    }
}
'@
}

function Set-DeviceConnected([string]$Mac, [bool]$Connected) {
  if (-not $Mac) { throw 'An address is required.' }
  Import-Win32Bluetooth
  [Win32Bluetooth]::SetConnected([Convert]::ToUInt64($Mac, 16), $Connected)
}

try {
  $result = switch ($Action) {
    'status' { @{ radio = (Get-Radio).State.ToString() } }
    'list' {
      $radio = (Get-Radio).State.ToString()
      # Enumerating with the radio off returns stale entries, so report nothing instead.
      @{ radio = $radio; devices = if ($radio -eq 'On') { Get-Devices } else { @() } }
    }
    'on' { Set-Radio ([Windows.Devices.Radios.RadioState]::On);  @{ radio = 'On' } }
    'off' { Set-Radio ([Windows.Devices.Radios.RadioState]::Off); @{ radio = 'Off' } }
    'connect' { Set-DeviceConnected $Address $true;  @{ ok = $true } }
    'disconnect' { Set-DeviceConnected $Address $false; @{ ok = $true } }
  }
  ConvertTo-Json $result -Depth 5 -Compress
}
catch {
  ConvertTo-Json @{ error = "$($_.Exception.Message)" } -Compress
  exit 1
}
