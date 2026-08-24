param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("List", "Connect", "Disconnect", "RefreshAll")]
  [string]$Action,
  [string]$MacAddress = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class ToothpickBluetoothAudio
{
    const uint CLSCTX_ALL = 23;
    const uint DEVICE_STATE_ALL = 15;
    const uint IOCTL_BTH_DISCONNECT_DEVICE = 0x0041000C;
    const int E_ALL = 2;
    const int ERROR_DEVICE_NOT_CONNECTED = 1167;

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumeratorClass { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator
    {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, uint stateMask, out IMMDeviceCollection devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    }

    [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceCollection
    {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int Item(uint index, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice
    {
        [PreserveSig] int Activate(ref Guid id, uint clsCtx, IntPtr activationParams,
            [MarshalAs(UnmanagedType.IUnknown)] out object result);
        [PreserveSig] int OpenPropertyStore(uint access, out IntPtr properties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out uint state);
    }

    [StructLayout(LayoutKind.Sequential)]
    struct BluetoothFindRadioParams { public int Size; }

    [DllImport("bthprops.cpl", SetLastError = true)]
    static extern IntPtr BluetoothFindFirstRadio(ref BluetoothFindRadioParams parameters, out IntPtr radio);

    [DllImport("bthprops.cpl", SetLastError = true)]
    static extern bool BluetoothFindRadioClose(IntPtr find);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool DeviceIoControl(IntPtr device, uint code, ref ulong input, int inputSize,
        IntPtr output, int outputSize, out uint returned, IntPtr overlapped);

    [ComImport, Guid("2A07407E-6497-4A18-9787-32F79BD0D98F"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IDeviceTopology
    {
        [PreserveSig] int GetConnectorCount(out uint count);
        [PreserveSig] int GetConnector(uint index, out IConnector connector);
    }

    [ComImport, Guid("9C2C4058-23F5-41DE-877A-DF3AF236A09E"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IConnector
    {
        [PreserveSig] int GetType(out uint type);
        [PreserveSig] int GetDataFlow(out uint flow);
        [PreserveSig] int ConnectTo(IConnector connector);
        [PreserveSig] int Disconnect();
        [PreserveSig] int IsConnected([MarshalAs(UnmanagedType.Bool)] out bool connected);
        [PreserveSig] int GetConnectedTo(out IConnector connector);
        [PreserveSig] int GetConnectorIdConnectedTo([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetDeviceIdConnectedTo([MarshalAs(UnmanagedType.LPWStr)] out string id);
    }
    [StructLayout(LayoutKind.Sequential)]
    struct KsProperty
    {
        public Guid Set;
        public uint Id;
        public uint Flags;
    }

    [ComImport, Guid("28F54685-06FD-11D2-B27A-00A0C9223196"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IKsControl
    {
        [PreserveSig] int KsProperty(ref KsProperty property, int propertyLength,
            IntPtr propertyData, int dataLength, ref int bytesReturned);
    }

    static T Activate<T>(IMMDevice device)
    {
        Guid id = typeof(T).GUID;
        object result;
        int hr = device.Activate(ref id, CLSCTX_ALL, IntPtr.Zero, out result);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        return (T)result;
    }

    static string Compact(string value)
    {
        return value.Replace(":", "").Replace("-", "").ToUpperInvariant();
    }

    static IEnumerable<IMMDevice> MatchingFilters(string address)
    {
        string compactAddress = Compact(address);
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorClass();
        IMMDeviceCollection collection;
        int hr = enumerator.EnumAudioEndpoints(E_ALL, DEVICE_STATE_ALL, out collection);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        uint count;
        collection.GetCount(out count);
        HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (uint i = 0; i < count; i++)
        {
            IMMDevice endpoint;
            collection.Item(i, out endpoint);
            IDeviceTopology topology;
            try { topology = Activate<IDeviceTopology>(endpoint); }
            catch { continue; }

            uint connectorCount;
            if (topology.GetConnectorCount(out connectorCount) < 0) continue;
            for (uint j = 0; j < connectorCount; j++)
            {
                IConnector connector;
                string filterId;
                if (topology.GetConnector(j, out connector) < 0 ||
                    connector.GetDeviceIdConnectedTo(out filterId) < 0 ||
                    String.IsNullOrEmpty(filterId) ||
                    filterId.IndexOf("bth", StringComparison.OrdinalIgnoreCase) < 0 ||
                    Compact(filterId).IndexOf(compactAddress, StringComparison.Ordinal) < 0 ||
                    !seen.Add(filterId))
                    continue;

                IMMDevice filter;
                if (enumerator.GetDevice(filterId, out filter) >= 0)
                    yield return filter;
            }
        }
    }

    public static bool CanControl(string address)
    {
        foreach (IMMDevice unused in MatchingFilters(address)) return true;
        return false;
    }

    public static bool Connect(string address)
    {
        bool sent = false;
        foreach (IMMDevice filter in MatchingFilters(address))
        {
            IKsControl control;
            try { control = Activate<IKsControl>(filter); }
            catch { continue; }

            KsProperty property = new KsProperty {
                Set = new Guid("7FA06C40-B8F6-4C7E-8556-E8C33A12E54D"),
                Id = 0,
                Flags = 1u
            };
            int returned = 0;
            int hr = control.KsProperty(ref property, Marshal.SizeOf(typeof(KsProperty)),
                IntPtr.Zero, 0, ref returned);
            if (hr >= 0)
            {
                sent = true;
            }
        }
        return sent;
    }

    public static void Disconnect(string address)
    {
        BluetoothFindRadioParams parameters = new BluetoothFindRadioParams { Size = 4 };
        IntPtr radio;
        IntPtr find = BluetoothFindFirstRadio(ref parameters, out radio);
        if (find == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
        try
        {
            ulong value = Convert.ToUInt64(address.Replace(":", ""), 16);
            uint returned;
            if (!DeviceIoControl(radio, IOCTL_BTH_DISCONNECT_DEVICE, ref value, 8, IntPtr.Zero, 0, out returned, IntPtr.Zero))
            {
                int error = Marshal.GetLastWin32Error();
                if (error != ERROR_DEVICE_NOT_CONNECTED) throw new Win32Exception(error);
            }
        }
        finally
        {
            CloseHandle(radio);
            BluetoothFindRadioClose(find);
        }
    }

}
'@

[void][Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
[void][Windows.Devices.Enumeration.DeviceInformationKind, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
[void][Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
[void][Windows.Devices.Bluetooth.BluetoothConnectionStatus, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
[void][Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
[void][Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime]
[void][Windows.Devices.Radios.RadioKind, Windows.System.Devices, ContentType = WindowsRuntime]
[void][Windows.Devices.Radios.RadioState, Windows.System.Devices, ContentType = WindowsRuntime]

function Wait-WinRt {
  param($Operation, [Type]$ResultType)

  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethod -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  $task.GetAwaiter().GetResult()
}

function Get-BluetoothRadio {
  $access = Wait-WinRt ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
  if ($access -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Bluetooth radio access denied: $access" }
  $radios = Wait-WinRt ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  @($radios | Where-Object Kind -eq ([Windows.Devices.Radios.RadioKind]::Bluetooth))[0]
}

function Set-BluetoothRadioState {
  param([Windows.Devices.Radios.RadioState]$State)

  $radio = Get-BluetoothRadio
  if (-not $radio) { throw "No Bluetooth radio found." }
  if ($radio.State -eq $State) { return }
  $result = Wait-WinRt ($radio.SetStateAsync($State)) ([Windows.Devices.Radios.RadioAccessStatus])
  if ($result -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) {
    throw "Bluetooth radio access denied: $result"
  }

  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($radio.State -eq $State) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "Timed out waiting for Bluetooth radio to become $State."
}

function Get-PairedBluetoothDevices {
  $properties = [System.Collections.Generic.List[string]]::new()
  @(
    "System.Devices.Aep.DeviceAddress",
    "System.Devices.Aep.IsConnected",
    "System.Devices.Aep.IsPresent",
    "System.Devices.Aep.Category"
  ) | ForEach-Object { $properties.Add($_) }

  $selectors = @(
    [Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromPairingState($true),
    [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromPairingState($true)
  )
  $items = @($selectors | ForEach-Object {
    $selector = "($_) AND System.Devices.Aep.IsPaired:=System.StructuredQueryType.Boolean#True"
    Wait-WinRt (
      [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync(
        $selector,
        $properties,
        [Windows.Devices.Enumeration.DeviceInformationKind]::DeviceInterface
      )
    ) ([Windows.Devices.Enumeration.DeviceInformationCollection])
  })

  @($items | ForEach-Object {
    $p = @{}
    foreach ($pair in $_.Properties) { $p[$pair.Key] = $pair.Value }
    $macValue = [string]$p["System.Devices.Aep.DeviceAddress"]
    $mac = if ($macValue) { $macValue.ToUpperInvariant() } else { "" }
    if (-not $mac) { return }
    $category = [string]@($p["System.Devices.Aep.Category"])[0]
    $audio = [ToothpickBluetoothAudio]::CanControl($mac)
    $type = if ($category -match "Keyboard") {
      "Keyboard"
    } elseif ($category -match "Mouse") {
      "Mouse"
    } elseif ($category -match "Gamepad") {
      "Gamepad"
    } elseif ($audio -and ($category -match "Head|Ear|Headset" -or $_.Name -match "Head|Ear|AirPods|Buds")) {
      "Headphones"
    } elseif ($audio) {
      "Speaker"
    } else {
      $category
    }

    $present = [bool]$p["System.Devices.Aep.IsPresent"]
    [pscustomobject]@{
      id = $_.Id
      name = $_.Name
      macAddress = $mac
      type = $type
      present = $present
      connected = $present -and [bool]$p["System.Devices.Aep.IsConnected"]
      controllable = $audio
      category = $category
    }
  } | Sort-Object name, macAddress -Unique)
}

function Get-ConnectionState {
  param([string]$Id)

  try {
    $device = Wait-WinRt (
      [Windows.Devices.Bluetooth.BluetoothDevice]::FromIdAsync($Id)
    ) ([Windows.Devices.Bluetooth.BluetoothDevice])
    if ($device) {
      return $device.ConnectionStatus -eq ([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected)
    }
  } catch {}

  try {
    $device = Wait-WinRt (
      [Windows.Devices.Bluetooth.BluetoothLEDevice]::FromIdAsync($Id)
    ) ([Windows.Devices.Bluetooth.BluetoothLEDevice])
    $device -and $device.ConnectionStatus -eq ([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected)
  } catch { $false }
}

function Wait-ConnectionState {
  param(
    [string]$Id,
    [string]$MacAddress,
    [bool]$Connected,
    [object[]]$SuppressDevices = @(),
    [int]$ConnectTimeoutSeconds = 10
  )

  $deadline = [DateTime]::UtcNow.AddSeconds($(if ($Connected) { $ConnectTimeoutSeconds } else { 12 }))
  $stableSamples = 0
  $mismatchingPolls = 0
  $requestAccepted = $false
  do {
    foreach ($device in $SuppressDevices) {
      if (Get-ConnectionState $device.id) {
        [ToothpickBluetoothAudio]::Disconnect($device.macAddress)
      }
    }

    $state = Get-ConnectionState $Id
    if ($state -eq $Connected) {
      $mismatchingPolls = 0
      $stableSamples++
      if ($stableSamples -ge 3) { return }
    } else {
      $stableSamples = 0
      if (-not $requestAccepted -or ($mismatchingPolls % 5) -eq 0) {
        if ($Connected) {
          $requestAccepted = [ToothpickBluetoothAudio]::Connect($MacAddress)
        } else {
          [ToothpickBluetoothAudio]::Disconnect($MacAddress)
          $requestAccepted = $true
        }
      }
      $mismatchingPolls++
    }
    Start-Sleep -Milliseconds 400
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "Timed out waiting for the Bluetooth device to become $(if ($Connected) { 'connected' } else { 'disconnected' })."
}

function Set-DeviceConnection {
  param([string]$Mac, [bool]$Connected)

  if ($Mac -notmatch '^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$') { throw "Invalid MAC address." }
  $pairedDevices = @(Get-PairedBluetoothDevices)
  $target = $pairedDevices | Where-Object macAddress -eq $Mac | Select-Object -First 1
  if (-not $target) { throw "Paired Bluetooth device not found." }
  if (-not $target.controllable) { throw "This Bluetooth profile is managed by Windows." }
  $otherDevices = @(
    $pairedDevices | Where-Object {
      $_.controllable -and $_.macAddress -ne $Mac
    }
  )
  $current = $target.connected
  if ($current -eq $Connected -and (-not $Connected -or -not ($otherDevices.connected -contains $true))) { return }
  $radioWasOff = $Connected -and (Get-BluetoothRadio).State -eq ([Windows.Devices.Radios.RadioState]::Off)

  try {
    if ($Connected) {
      Set-BluetoothRadioState On
    }

    if ($Connected -and $radioWasOff) {
      Wait-ConnectionState $target.id $target.macAddress $Connected $otherDevices 15
    } else {
      Wait-ConnectionState $target.id $target.macAddress $Connected
    }

    if ($Connected) {
      $otherDeviceCleanedUp = $false
      $otherDevices | ForEach-Object {
        if (Get-ConnectionState $_.id) {
          $otherDeviceCleanedUp = $true
          Wait-ConnectionState $_.id $_.macAddress $false
        }
      }
      if ($otherDeviceCleanedUp) {
        Wait-ConnectionState $target.id $target.macAddress $true $otherDevices
      }
    }
  } catch {
    if ($radioWasOff) {
      Set-BluetoothRadioState Off
    }
    throw
  }
}

function Test-ActiveBluetoothInput {
  @(Get-PnpDevice -Class Keyboard, Mouse -PresentOnly -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq "OK" -and $_.InstanceId -match '^(BTHENUM|BTHLEDEVICE)\\' }).Count -gt 0
}

try {
  switch ($Action) {
    "List" {
      ConvertTo-Json -InputObject @(Get-PairedBluetoothDevices) -Compress
    }
    "Connect" {
      Set-DeviceConnection $MacAddress.ToUpperInvariant() $true
      [pscustomobject]@{ success = $true } | ConvertTo-Json -Compress
    }
    "Disconnect" {
      Set-DeviceConnection $MacAddress.ToUpperInvariant() $false
      [pscustomobject]@{ success = $true } | ConvertTo-Json -Compress
    }
    "RefreshAll" {
      if (Test-ActiveBluetoothInput) { throw "Refresh All is unavailable while a Bluetooth keyboard or mouse is active." }
      $initialState = (Get-BluetoothRadio).State
      try {
        Set-BluetoothRadioState Off
      } finally {
        Set-BluetoothRadioState $initialState
      }
      [pscustomobject]@{ success = $true } | ConvertTo-Json -Compress
    }
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
