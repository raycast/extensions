using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Rfcomm;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Devices.Enumeration;
using Windows.Devices.Radios;
using Windows.Media.Devices;

// ─── Win32 P/Invoke for reliable Classic Bluetooth disconnect ─────────────────

static class BthWin32
{
    [StructLayout(LayoutKind.Sequential)]
    public struct BLUETOOTH_FIND_RADIO_PARAMS
    {
        public uint dwSize;
        public static BLUETOOTH_FIND_RADIO_PARAMS Init() =>
            new() { dwSize = (uint)Marshal.SizeOf<BLUETOOTH_FIND_RADIO_PARAMS>() };
    }

    // Explicit layout matching the Windows SDK struct (560 bytes).
    // Only dwSize and Address are required for BluetoothSetServiceState.
    [StructLayout(LayoutKind.Explicit, Size = 560)]
    public struct BLUETOOTH_DEVICE_INFO
    {
        [FieldOffset(0)] public uint dwSize;
        [FieldOffset(8)] public ulong Address; // BTH_ADDR (6-byte MAC in low bits)
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SYSTEMTIME
    {
        public ushort wYear, wMonth, wDayOfWeek, wDay,
                      wHour, wMinute, wSecond, wMilliseconds;
    }

    [DllImport("bthprops.cpl", SetLastError = true)]
    public static extern IntPtr BluetoothFindFirstRadio(
        ref BLUETOOTH_FIND_RADIO_PARAMS pbtfrp, out IntPtr phRadio);

    [DllImport("bthprops.cpl", SetLastError = true)]
    public static extern bool BluetoothFindRadioClose(IntPtr hFind);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("bthprops.cpl", SetLastError = true)]
    public static extern uint BluetoothSetServiceState(
        IntPtr hRadio, ref BLUETOOTH_DEVICE_INFO pbtdi,
        ref Guid pSdpGuid, uint dwServiceFlags);

    public const uint SERVICE_DISABLE = 0;
    public const uint SERVICE_ENABLE = 1;

    // Common SDP service class GUIDs covering typical audio / HID / serial profiles
    public static readonly Guid[] CommonProfiles =
    [
        new("0000110B-0000-1000-8000-00805F9B34FB"), // A2DP Sink
        new("0000110A-0000-1000-8000-00805F9B34FB"), // A2DP Source
        new("0000110D-0000-1000-8000-00805F9B34FB"), // Advanced Audio Distribution
        new("0000110E-0000-1000-8000-00805F9B34FB"), // AVRCP Controller
        new("0000110C-0000-1000-8000-00805F9B34FB"), // AVRCP Target
        new("0000111E-0000-1000-8000-00805F9B34FB"), // HFP Hands-Free Unit
        new("00001108-0000-1000-8000-00805F9B34FB"), // HSP Headset
        new("00001124-0000-1000-8000-00805F9B34FB"), // HID
        new("00001101-0000-1000-8000-00805F9B34FB"), // SPP Serial Port
        new("0000112F-0000-1000-8000-00805F9B34FB"), // PBAP Phone Book
        new("00001132-0000-1000-8000-00805F9B34FB"), // MAP Message Access
    ];

    public static IntPtr OpenDefaultRadio()
    {
        var frp = BLUETOOTH_FIND_RADIO_PARAMS.Init();
        var hFind = BluetoothFindFirstRadio(ref frp, out IntPtr hRadio);
        if (hFind != IntPtr.Zero) BluetoothFindRadioClose(hFind);
        return hRadio; // caller must CloseHandle
    }
}

// ─── COM: IPolicyConfig — undocumented but stable since Vista ────────────────
// Used to set the Windows default audio endpoint without a driver.
// Only SetDefaultEndpoint (vtable slot 10) is called; the rest are stubs.

enum ERole : uint { eConsole = 0, eMultimedia = 1, eCommunications = 2 }

[ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9")]
class PolicyConfigClient { }

[ComImport, Guid("F8679F50-850A-41CF-9C72-430F290290C8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig
{
    void _s0();  // GetMixFormat
    void _s1();  // GetDeviceFormat
    void _s2();  // ResetDeviceFormat
    void _s3();  // SetDeviceFormat
    void _s4();  // GetProcessingPeriod
    void _s5();  // SetProcessingPeriod
    void _s6();  // GetShareMode
    void _s7();  // SetShareMode
    void _s8();  // GetPropertyValue
    void _s9();  // SetPropertyValue
    [PreserveSig] int SetDefaultEndpoint(
        [MarshalAs(UnmanagedType.LPWStr)] string deviceId, ERole role);
    void _s11(); // SetEndpointVisibility
}

// ─── Response / domain types ──────────────────────────────────────────────────

record DeviceDto(
    string Id,
    string Name,
    bool IsPaired,
    bool IsConnected,
    bool CanPair,
    string DeviceKind,       // "Classic" | "LE"
    string? DeviceAddress,
    ulong? BluetoothAddress
);

// ─── Entry point ──────────────────────────────────────────────────────────────

class Program
{
    static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    static async Task<int> Main(string[] args)
    {
        if (args.Length == 0)
        {
            Ok(new { usage = "WinBluetoothCli <list|connect|disconnect|remove|pair|toggle|status|scan|info> [deviceId]" });
            return 0;
        }

        try
        {
            switch (args[0].ToLowerInvariant())
            {
                case "list":       await ListAsync(); break;
                case "connect":    await ConnectAsync(Arg(args, 1)); break;
                case "disconnect": await DisconnectAsync(Arg(args, 1)); break;
                case "remove":     await RemoveAsync(Arg(args, 1)); break;
                case "pair":       await PairAsync(Arg(args, 1)); break;
                case "toggle":     await ToggleAsync(); break;
                case "status":     await StatusAsync(); break;
                case "scan":       await ScanAsync(); break;
                case "info":       await InfoAsync(Arg(args, 1)); break;
                case "audio-list": await AudioListAsync(); break;
                case "set-audio":  await SetAudioAsync(Arg(args, 1)); break;
                default:           Err($"Unknown command: {args[0]}"); break;
            }
        }
        catch (Exception ex)
        {
            Err(ex.Message);
            return 1;
        }

        return 0;
    }

    static string Arg(string[] args, int i)
    {
        if (i >= args.Length) throw new Exception($"Missing argument {i}");
        return args[i];
    }

    // ── list ──────────────────────────────────────────────────────────────────

    static async Task ListAsync()
    {
        // Properties we request alongside enumeration (avoids per-device async calls)
        string[] props = ["System.Devices.Aep.IsConnected", "System.Devices.Aep.DeviceAddress"];
        var devices = new List<DeviceDto>();

        // Classic Bluetooth paired devices
        var classicSel = BluetoothDevice.GetDeviceSelectorFromPairingState(true);
        var classicDevs = await DeviceInformation.FindAllAsync(classicSel, props);
        foreach (var d in classicDevs)
            devices.Add(ToDto(d, "Classic"));

        // Bluetooth LE paired devices
        var leSel = BluetoothLEDevice.GetDeviceSelectorFromPairingState(true);
        var leDevs = await DeviceInformation.FindAllAsync(leSel, props);
        foreach (var d in leDevs)
            devices.Add(ToDto(d, "LE"));

        Ok(devices);
    }

    static DeviceDto ToDto(DeviceInformation d, string kind)
    {
        bool connected = d.Properties.TryGetValue("System.Devices.Aep.IsConnected", out var cv)
                         && cv is bool b && b;
        string? addr = d.Properties.TryGetValue("System.Devices.Aep.DeviceAddress", out var av)
                       ? av?.ToString() : null;

        // Parse BT address from the AEP device address string (e.g. "aa:bb:cc:dd:ee:ff")
        ulong? numericAddr = null;
        if (addr != null)
        {
            var bytes = addr.Split(':');
            if (bytes.Length == 6)
            {
                ulong a = 0;
                for (int i = 0; i < 6; i++)
                    a |= ((ulong)Convert.ToByte(bytes[i], 16)) << ((5 - i) * 8);
                numericAddr = a;
            }
        }

        return new DeviceDto(
            Id: d.Id,
            Name: string.IsNullOrEmpty(d.Name) ? "Unknown Device" : d.Name,
            IsPaired: d.Pairing.IsPaired,
            IsConnected: connected,
            CanPair: d.Pairing.CanPair,
            DeviceKind: kind,
            DeviceAddress: addr,
            BluetoothAddress: numericAddr
        );
    }

    // ── connect ───────────────────────────────────────────────────────────────
    //
    // Root cause of the "connects then immediately disconnects" bug (AirPods etc.):
    //   The original code used `using var dev = BluetoothDevice.FromIdAsync(...)` which
    //   disposes the WinRT object at end of scope.  Windows interprets disposal as "the
    //   client released the connection" and severs it before the audio stack can claim it.
    //
    // Fix: use Win32 BluetoothSetServiceState(SERVICE_ENABLE) to activate profiles at the
    //   radio level.  This is a persistent radio-level operation that survives process exit
    //   and gives the OS audio stack time to claim the connection.

    static async Task ConnectAsync(string deviceId)
    {
        if (IsClassic(deviceId))
        {
            // Do NOT use 'using' — disposing the WinRT handle signals disconnection
            var dev = await BluetoothDevice.FromIdAsync(deviceId)
                      ?? throw new Exception("Device not found");

            string name = dev.Name;
            ulong btAddr = dev.BluetoothAddress;

            // Primary: Win32 SERVICE_ENABLE — persists after process exit
            bool win32Ok = false;
            IntPtr hRadio = BthWin32.OpenDefaultRadio();
            if (hRadio != IntPtr.Zero)
            {
                var info = new BthWin32.BLUETOOTH_DEVICE_INFO { dwSize = 560, Address = btAddr };
                int enabled = 0;
                foreach (var guid in BthWin32.CommonProfiles)
                {
                    var g = guid;
                    if (BthWin32.BluetoothSetServiceState(hRadio, ref info, ref g, BthWin32.SERVICE_ENABLE) == 0)
                        enabled++;
                }
                BthWin32.CloseHandle(hRadio);
                win32Ok = enabled > 0;
            }

            // Fallback: RFCOMM service discovery — only if Win32 path unavailable.
            // Note: do NOT dispose 'dev' here; keep the WinRT handle alive until GC
            // so the OS audio stack has a window to establish its own connection.
            string method;
            if (win32Ok)
            {
                method = "win32";
                // Win32 activation is async at the radio level — give the OS a moment
                // to actually establish the physical connection before we verify.
                await Task.Delay(1500);
            }
            else
            {
                var rfResult = await dev.GetRfcommServicesAsync(BluetoothCacheMode.Uncached);
                method = "rfcomm";
                // Zero services back = device did not respond (out of range / off)
                if (rfResult.Services.Count == 0 &&
                    dev.ConnectionStatus != BluetoothConnectionStatus.Connected)
                {
                    Err($"'{name}' did not respond. Make sure it is turned on and in range.");
                    return;
                }
            }

            // Ground-truth check via AEP property (same source the List command uses)
            bool connected = await CheckConnectedAsync(deviceId);
            if (connected)
                Ok(new { connected = true, name, method });
            else
                Err($"'{name}' did not connect. Make sure it is turned on and in range.");
        }
        else if (IsLE(deviceId))
        {
            // For LE: do NOT dispose — keep handle alive for GATT stack to claim
            var dev = await BluetoothLEDevice.FromIdAsync(deviceId)
                      ?? throw new Exception("Device not found");
            var result = await dev.GetGattServicesAsync(BluetoothCacheMode.Uncached);

            bool connected = dev.ConnectionStatus == BluetoothConnectionStatus.Connected
                             || result.Services.Count > 0;
            if (connected)
                Ok(new { connected = true, name = dev.Name, method = "gatt" });
            else
                Err($"'{dev.Name}' did not connect. Make sure it is turned on and in range.");
        }
        else Err("Unrecognised device ID format");
    }

    // Re-queries the AEP IsConnected property — the same ground truth used by list.
    static async Task<bool> CheckConnectedAsync(string deviceId)
    {
        try
        {
            var info = await DeviceInformation.CreateFromIdAsync(
                deviceId,
                ["System.Devices.Aep.IsConnected"],
                DeviceInformationKind.AssociationEndpoint);
            return info?.Properties.TryGetValue("System.Devices.Aep.IsConnected", out var v) == true
                   && v is bool b && b;
        }
        catch { return false; }
    }

    // ── disconnect ────────────────────────────────────────────────────────────

    static async Task DisconnectAsync(string deviceId)
    {
        if (IsClassic(deviceId))
        {
            using var dev = await BluetoothDevice.FromIdAsync(deviceId)
                            ?? throw new Exception("Device not found");

            string name = dev.Name;
            ulong btAddr = dev.BluetoothAddress;

            // Win32: disable all common SDP service profiles → severs the connection
            bool win32Ok = false;
            IntPtr hRadio = BthWin32.OpenDefaultRadio();
            if (hRadio != IntPtr.Zero)
            {
                var info = new BthWin32.BLUETOOTH_DEVICE_INFO
                {
                    dwSize = 560,
                    Address = btAddr
                };

                int disabled = 0;
                foreach (var guid in BthWin32.CommonProfiles)
                {
                    var g = guid;
                    if (BthWin32.BluetoothSetServiceState(hRadio, ref info, ref g, BthWin32.SERVICE_DISABLE) == 0)
                        disabled++;
                }
                BthWin32.CloseHandle(hRadio);
                win32Ok = disabled > 0;
            }

            // Dispose the WinRT object as a secondary measure
            dev.Dispose();

            Ok(new
            {
                disconnected = true,
                name,
                method = win32Ok ? "win32+dispose" : "dispose",
                note = win32Ok ? null : "Win32 radio unavailable; WinRT object disposed"
            });
        }
        else if (IsLE(deviceId))
        {
            // For LE, disposing the device object closes the GATT connection
            var dev = await BluetoothLEDevice.FromIdAsync(deviceId)
                      ?? throw new Exception("Device not found");
            string name = dev.Name;
            dev.Dispose();
            Ok(new { disconnected = true, name, method = "dispose" });
        }
        else Err("Unrecognised device ID format");
    }

    // ── remove (unpair) ───────────────────────────────────────────────────────

    static async Task RemoveAsync(string deviceId)
    {
        var devInfo = await DeviceInformation.CreateFromIdAsync(
            deviceId, [],
            IsClassic(deviceId) ? DeviceInformationKind.AssociationEndpoint
                                : DeviceInformationKind.AssociationEndpoint)
            ?? throw new Exception("Device not found");

        if (!devInfo.Pairing.IsPaired)
        {
            Ok(new { removed = true, name = devInfo.Name, note = "Already unpaired" });
            return;
        }

        var result = await devInfo.Pairing.UnpairAsync();
        bool success = result.Status is DeviceUnpairingResultStatus.Unpaired
                                     or DeviceUnpairingResultStatus.AlreadyUnpaired;
        if (success)
            Ok(new { removed = true, name = devInfo.Name });
        else
            Err($"Unpair failed: {result.Status}");
    }

    // ── pair ──────────────────────────────────────────────────────────────────

    static async Task PairAsync(string deviceId)
    {
        var devInfo = await DeviceInformation.CreateFromIdAsync(
            deviceId, [], DeviceInformationKind.AssociationEndpoint)
            ?? throw new Exception("Device not found");

        if (devInfo.Pairing.IsPaired)
        {
            Ok(new { paired = true, name = devInfo.Name, note = "Already paired" });
            return;
        }

        if (!devInfo.Pairing.CanPair)
            throw new Exception("Device cannot be paired at this time");

        var result = await devInfo.Pairing.PairAsync();
        bool success = result.Status is DevicePairingResultStatus.Paired
                                     or DevicePairingResultStatus.AlreadyPaired;
        if (success)
            Ok(new { paired = true, name = devInfo.Name });
        else
            Err($"Pairing failed: {result.Status}");
    }

    // ── toggle ────────────────────────────────────────────────────────────────

    static async Task ToggleAsync()
    {
        var radios = await Radio.GetRadiosAsync();
        var bt = radios.FirstOrDefault(r => r.Kind == RadioKind.Bluetooth)
                 ?? throw new Exception("No Bluetooth adapter found");

        bool turnOn = bt.State != RadioState.On;
        await bt.SetStateAsync(turnOn ? RadioState.On : RadioState.Off);
        Ok(new { bluetoothEnabled = turnOn, adapterName = bt.Name });
    }

    // ── status ────────────────────────────────────────────────────────────────

    static async Task StatusAsync()
    {
        var radios = await Radio.GetRadiosAsync();
        var bt = radios.FirstOrDefault(r => r.Kind == RadioKind.Bluetooth);

        if (bt == null)
            Ok(new { available = false, enabled = false, adapterName = (string?)null, state = "Unavailable" });
        else
            Ok(new
            {
                available = true,
                enabled = bt.State == RadioState.On,
                adapterName = bt.Name,
                state = bt.State.ToString()
            });
    }

    // ── scan ──────────────────────────────────────────────────────────────────
    //
    // Root cause of "device visible in Windows Settings but not extension":
    //   FindAllAsync only reads Windows' existing discovery cache; it does NOT put
    //   the radio into inquiry mode.  DeviceWatcher does — it's the same API path
    //   that Windows Bluetooth Settings uses internally.
    //
    // We also switch to protocol-GUID selectors at AssociationEndpoint level, which
    // is the same device-information kind that Windows Settings enumerates.

    static async Task ScanAsync()
    {
        // Hard cap: Classic BT inquiry takes ~10 s; LE is faster.
        // Both watchers run in parallel so the wall-clock wait is max(classic, le).
        const int ScanTimeoutMs = 10_000;

        string[] props = ["System.Devices.Aep.IsConnected", "System.Devices.Aep.DeviceAddress"];
        var devices = new List<DeviceDto>();
        var seen    = new HashSet<string>();
        object gate = new();

        void OnAdded(string kind, DeviceInformation info)
        {
            lock (gate)
            {
                if (seen.Add(info.Id))
                    devices.Add(ToDto(info, kind));
            }
        }

        // Protocol GUIDs — identical to what Windows Bluetooth Settings uses
        const string ClassicProto = "System.Devices.Aep.ProtocolId:=\"{e0cbf06c-cd8b-4647-bb8a-263b43f0f974}\"";
        const string LeProto      = "System.Devices.Aep.ProtocolId:=\"{bb7bb05e-5972-42b5-94fc-76eaa7084d49}\"";

        var watchers     = new List<DeviceWatcher>();
        var completions  = new List<TaskCompletionSource>();

        foreach (var (sel, kind) in new[] { (ClassicProto, "Classic"), (LeProto, "LE") })
        {
            var tcs     = new TaskCompletionSource();
            var watcher = DeviceInformation.CreateWatcher(
                sel, props, DeviceInformationKind.AssociationEndpoint);

            watcher.Added              += (_, info) => OnAdded(kind, info);
            watcher.EnumerationCompleted += (_, _)  => tcs.TrySetResult();
            watcher.Stopped            += (_, _)    => tcs.TrySetResult();

            watcher.Start();
            watchers.Add(watcher);
            completions.Add(tcs);
        }

        // Wait until both watchers finish their initial enumeration OR the hard cap hits
        await Task.WhenAny(
            Task.WhenAll(completions.Select(t => t.Task)),
            Task.Delay(ScanTimeoutMs));

        // Stop all watchers (safe: only stop if in a stoppable state)
        foreach (var w in watchers)
        {
            try
            {
                if (w.Status is DeviceWatcherStatus.Started
                             or DeviceWatcherStatus.EnumerationCompleted)
                    w.Stop();
            }
            catch { /* already stopped */ }
        }

        Ok(devices);
    }

    // ── info ──────────────────────────────────────────────────────────────────

    static async Task InfoAsync(string deviceId)
    {
        if (IsClassic(deviceId))
        {
            using var dev = await BluetoothDevice.FromIdAsync(deviceId)
                            ?? throw new Exception("Device not found");
            var services = await dev.GetRfcommServicesAsync(BluetoothCacheMode.Cached);
            Ok(new
            {
                id = dev.DeviceId,
                name = dev.Name,
                bluetoothAddress = dev.BluetoothAddress,
                connectionStatus = dev.ConnectionStatus.ToString(),
                deviceKind = "Classic",
                rfcommServices = services.Services.Select(s => s.ServiceId.Uuid.ToString()).ToList()
            });
        }
        else if (IsLE(deviceId))
        {
            using var dev = await BluetoothLEDevice.FromIdAsync(deviceId)
                            ?? throw new Exception("Device not found");
            var services = await dev.GetGattServicesAsync(BluetoothCacheMode.Cached);
            Ok(new
            {
                id = dev.DeviceId,
                name = dev.Name,
                bluetoothAddress = dev.BluetoothAddress,
                connectionStatus = dev.ConnectionStatus.ToString(),
                deviceKind = "LE",
                gattServices = services.Services.Select(s => s.Uuid.ToString()).ToList()
            });
        }
        else Err("Unrecognised device ID format");
    }

    // ── audio-list ────────────────────────────────────────────────────────────
    // Returns all Windows audio render (output) endpoints with their default status.
    // The caller matches these to Bluetooth devices by name.

    static async Task AudioListAsync()
    {
        var selector = MediaDevice.GetAudioRenderSelector();
        var audioDevs = await DeviceInformation.FindAllAsync(selector);

        // Default render endpoint IDs for the three roles
        var defaultConsole = MediaDevice.GetDefaultAudioRenderId(AudioDeviceRole.Default);
        var defaultComms   = MediaDevice.GetDefaultAudioRenderId(AudioDeviceRole.Communications);

        var list = audioDevs.Select(d => new
        {
            // Full WinRT ID (used with DeviceInformation)
            id = d.Id,
            // Stripped MMDEVAPI endpoint ID expected by IPolicyConfig.SetDefaultEndpoint
            // WinRT ID format: "\\?\SWD#MMDEVAPI#{0.0.0.00000000}.{guid}#{guid}"
            endpointId = ExtractMmdevId(d.Id),
            name = d.Name,
            isDefaultOutput = d.Id == defaultConsole,
            isDefaultComms  = d.Id == defaultComms,
        }).ToList();

        Ok(list);
    }

    // ── set-audio ─────────────────────────────────────────────────────────────
    // Sets the given audio endpoint as the default for all three roles.
    // Accepts either the full WinRT device ID or the stripped MMDEVAPI endpoint ID.

    static Task SetAudioAsync(string rawId)
    {
        // Accept both the full WinRT ID and the already-stripped MMDEVAPI ID
        var endpointId = rawId.Contains("MMDEVAPI", StringComparison.OrdinalIgnoreCase)
            ? ExtractMmdevId(rawId)
            : rawId;

        try
        {
            var policy = (IPolicyConfig)new PolicyConfigClient();
            foreach (ERole role in Enum.GetValues<ERole>())
            {
                int hr = policy.SetDefaultEndpoint(endpointId, role);
                if (hr != 0)
                    throw new Exception($"SetDefaultEndpoint failed for role {role}: HRESULT 0x{hr:X8}");
            }
            Ok(new { set = true, endpointId });
        }
        catch (Exception ex)
        {
            Err($"Failed to set audio device: {ex.Message}");
        }

        return Task.CompletedTask;
    }

    // Extracts the MMDEVAPI endpoint ID from a WinRT DeviceInformation ID.
    // e.g. "\\?\SWD#MMDEVAPI#{0.0.0.00000000}.{guid}#{guid}" → "{0.0.0.00000000}.{guid}"
    static string ExtractMmdevId(string winrtId)
    {
        const string marker = "#MMDEVAPI#";
        int start = winrtId.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (start < 0) return winrtId;
        start += marker.Length;
        int end = winrtId.LastIndexOf('#');
        return end > start ? winrtId[start..end] : winrtId[start..];
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    static bool IsClassic(string id) =>
        id.StartsWith("Bluetooth#Bluetooth", StringComparison.OrdinalIgnoreCase);

    static bool IsLE(string id) =>
        id.StartsWith("BluetoothLE#", StringComparison.OrdinalIgnoreCase);

    static void Ok<T>(T data) =>
        Console.WriteLine(JsonSerializer.Serialize(new { success = true, data }, Json));

    static void Err(string message) =>
        Console.WriteLine(JsonSerializer.Serialize(new { success = false, error = message }, Json));
}
