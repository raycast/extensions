using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32;
using Windows.Devices.Bluetooth;
using Windows.Devices.Enumeration;
using Windows.Devices.Radios;

class QuickRadiosHelper {
    // WLAN API for hardware channel scanning
    [DllImport("wlanapi.dll", SetLastError = true)]
    private static extern uint WlanOpenHandle(uint dwClientVersion, IntPtr pReserved, out uint pdwNegotiatedVersion, out IntPtr phClientHandle);

    [DllImport("wlanapi.dll", SetLastError = true)]
    private static extern uint WlanCloseHandle(IntPtr hClientHandle, IntPtr pReserved);

    [DllImport("wlanapi.dll", SetLastError = true)]
    private static extern uint WlanEnumInterfaces(IntPtr hClientHandle, IntPtr pReserved, out IntPtr ppInterfaceList);

    [DllImport("wlanapi.dll", SetLastError = true)]
    private static extern uint WlanScan(IntPtr hClientHandle, ref Guid pInterfaceGuid, IntPtr pDot11Ssid, IntPtr pIeData, IntPtr pReserved);

    [DllImport("wlanapi.dll")]
    private static extern void WlanFreeMemory(IntPtr pMemory);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WLAN_INTERFACE_INFO {
        public Guid InterfaceGuid;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
        public string strInterfaceDescription;
        public int isState;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct SYSTEMTIME {
        public ushort wYear, wMonth, wDayOfWeek, wDay, wHour, wMinute, wSecond, wMilliseconds;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct BLUETOOTH_DEVICE_INFO {
        public uint dwSize;
        public ulong Address;
        public uint ulClassofDevice;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fConnected;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fRemembered;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fAuthenticated;
        public SYSTEMTIME stLastSeen;
        public SYSTEMTIME stLastUsed;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 248)]
        public string szName;
    }

    [DllImport("BluetoothApis.dll", SetLastError = true)]
    private static extern uint BluetoothEnumerateInstalledServices(
        IntPtr hRadio,
        ref BLUETOOTH_DEVICE_INFO pbtdi,
        ref uint pcServices,
        [In, Out] byte[] pGuidServices
    );

    [DllImport("BluetoothApis.dll", SetLastError = true)]
    private static extern uint BluetoothSetServiceState(
        IntPtr hRadio,
        ref BLUETOOTH_DEVICE_INFO pbtdi,
        ref Guid pGuidService,
        uint dwServiceFlags
    );

    [StructLayout(LayoutKind.Sequential)]
    private struct BLUETOOTH_DEVICE_SEARCH_PARAMS {
        public uint dwSize;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fReturnAuthenticated;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fReturnRemembered;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fReturnUnknown;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fReturnConnected;
        [MarshalAs(UnmanagedType.Bool)]
        public bool fIssueInquiry;
        public byte cTimeoutMultiplier;
        public IntPtr hRadio;
    }

    [DllImport("BluetoothApis.dll", SetLastError = true)]
    private static extern IntPtr BluetoothFindFirstDevice(ref BLUETOOTH_DEVICE_SEARCH_PARAMS searchParams, ref BLUETOOTH_DEVICE_INFO deviceInfo);

    [DllImport("BluetoothApis.dll", SetLastError = true)]
    private static extern bool BluetoothFindNextDevice(IntPtr hFind, ref BLUETOOTH_DEVICE_INFO deviceInfo);

    [DllImport("BluetoothApis.dll", SetLastError = true)]
    private static extern bool BluetoothFindDeviceClose(IntPtr hFind);

    private static int ScanWifi() {
        try {
            uint negVersion;
            IntPtr hClient;
            if (WlanOpenHandle(2, IntPtr.Zero, out negVersion, out hClient) != 0) {
                Console.WriteLine("ErrorOpenHandle");
                return 1;
            }
            try {
                IntPtr pList;
                if (WlanEnumInterfaces(hClient, IntPtr.Zero, out pList) != 0) {
                    Console.WriteLine("ErrorEnumInterfaces");
                    return 2;
                }
                try {
                    uint count = (uint)Marshal.ReadInt32(pList, 0);
                    IntPtr pInfo = new IntPtr(pList.ToInt64() + 8);
                    for (int i = 0; i < count; i++) {
                        WLAN_INTERFACE_INFO info = (WLAN_INTERFACE_INFO)Marshal.PtrToStructure(pInfo, typeof(WLAN_INTERFACE_INFO));
                        WlanScan(hClient, ref info.InterfaceGuid, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                        pInfo = new IntPtr(pInfo.ToInt64() + Marshal.SizeOf(typeof(WLAN_INTERFACE_INFO)));
                    }
                } finally {
                    WlanFreeMemory(pList);
                }
            } finally {
                WlanCloseHandle(hClient, IntPtr.Zero);
            }
            Console.WriteLine("OK");
            return 0;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 3;
        }
    }

    private static Radio FindRadio(RadioKind kind) {
        var op = Radio.GetRadiosAsync();
        var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
        if (!task.Wait(3000)) return null;
        var radios = task.Result;
        foreach (var r in radios) {
            if (r.Kind == kind) return r;
        }
        return null;
    }

    private static int GetRadioStatus(RadioKind kind) {
        try {
            var radio = FindRadio(kind);
            if (radio == null) {
                Console.WriteLine("NotFound");
                return 1;
            }
            Console.WriteLine(radio.State == RadioState.On ? "On" : "Off");
            return 0;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 2;
        }
    }

    private static int ToggleRadio(RadioKind kind, string targetStateStr) {
        try {
            var radio = FindRadio(kind);
            if (radio == null) {
                Console.WriteLine("NotFound");
                return 1;
            }
            RadioState targetState;
            if (string.Equals(targetStateStr, "on", StringComparison.OrdinalIgnoreCase)) {
                targetState = RadioState.On;
            } else if (string.Equals(targetStateStr, "off", StringComparison.OrdinalIgnoreCase)) {
                targetState = RadioState.Off;
            } else {
                targetState = (radio.State == RadioState.On) ? RadioState.Off : RadioState.On;
            }

            var setOp = radio.SetStateAsync(targetState);
            var setTask = System.WindowsRuntimeSystemExtensions.AsTask(setOp);
            if (!setTask.Wait(4000)) {
                Console.WriteLine("Timeout");
                return 2;
            }
            Console.WriteLine(targetState == RadioState.On ? "On" : "Off");
            return 0;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 3;
        }
    }

    private static bool TryParseMac(string input, out ulong address, out string cleanHex) {
        address = 0;
        cleanHex = "";
        if (string.IsNullOrEmpty(input)) return false;

        int devIdx = input.IndexOf("DEV_", StringComparison.OrdinalIgnoreCase);
        if (devIdx >= 0) {
            input = input.Substring(devIdx + 4);
            int slashIdx = input.IndexOf('\\');
            if (slashIdx >= 0) input = input.Substring(0, slashIdx);
            int ampIdx = input.IndexOf('&');
            if (ampIdx >= 0) input = input.Substring(0, ampIdx);
        }

        var sb = new System.Text.StringBuilder();
        foreach (char c in input) {
            if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
                sb.Append(c);
            }
        }
        cleanHex = sb.ToString().ToUpperInvariant();
        if (cleanHex.Length != 12) return false;

        try {
            address = Convert.ToUInt64(cleanHex, 16);
            return true;
        } catch {
            return false;
        }
    }

    private static volatile bool _operationComplete = false;
    private static int _exitOnce = 0;

    private static void CompleteSuccess(string message) {
        if (Interlocked.Exchange(ref _exitOnce, 1) == 0) {
            _operationComplete = true;
            Console.WriteLine(message);
            try {
                Console.Out.Flush();
            } catch {}
            Environment.Exit(0);
        }
    }

    private static int GetDeviceConnectionState(ulong address) {
        try {
            var op = BluetoothDevice.FromBluetoothAddressAsync(address);
            var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
            if (task.Wait(350)) {
                if (task.Result != null) {
                    var isConn = task.Result.ConnectionStatus == BluetoothConnectionStatus.Connected;
                    try {
                        task.Result.Dispose();
                    } catch {}
                    return isConn ? 1 : 0;
                }
                return -1;
            }
        } catch {}
        return -1;
    }

    private static int GetServicePriority(Guid g) {
        string s = g.ToString().ToLowerInvariant();
        if (s.StartsWith("0000110b")) return 100; // Audio Sink (A2DP)
        if (s.StartsWith("0000111e")) return 90;  // Handsfree (HFP)
        if (s.StartsWith("00001124")) return 85;  // HID
        if (s.StartsWith("0000110a")) return 80;  // Audio Source
        if (s.StartsWith("00001108")) return 70;  // Headset (HSP)
        return 10;
    }

    private static List<Guid> GetDeviceServices(ulong address, string cleanHex) {
        var guids = new List<Guid>();
        var seen = new HashSet<Guid>();

        BLUETOOTH_DEVICE_INFO btdi = new BLUETOOTH_DEVICE_INFO();
        btdi.dwSize = (uint)Marshal.SizeOf(typeof(BLUETOOTH_DEVICE_INFO));
        btdi.Address = address;

        // 1. Enumerate currently installed services
        uint numServices = 0;
        BluetoothEnumerateInstalledServices(IntPtr.Zero, ref btdi, ref numServices, null);
        if (numServices > 0) {
            byte[] buffer = new byte[numServices * 16];
            if (BluetoothEnumerateInstalledServices(IntPtr.Zero, ref btdi, ref numServices, buffer) == 0) {
                for (int i = 0; i < numServices; i++) {
                    byte[] single = new byte[16];
                    Array.Copy(buffer, i * 16, single, 0, 16);
                    var g = new Guid(single);
                    if (seen.Add(g)) guids.Add(g);
                }
            }
        }

        // 2. Query registry for cached services
        try {
            string regPath = @"SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters\Devices\" + cleanHex.ToLowerInvariant();
            using (var devKey = Registry.LocalMachine.OpenSubKey(regPath)) {
                if (devKey != null) {
                    foreach (string subkeyName in devKey.GetSubKeyNames()) {
                        if (subkeyName.StartsWith("ServicesFor", StringComparison.OrdinalIgnoreCase)) {
                            using (var servicesKey = devKey.OpenSubKey(subkeyName)) {
                                if (servicesKey != null) {
                                    foreach (string guidStr in servicesKey.GetSubKeyNames()) {
                                        Guid parsed;
                                        if (Guid.TryParse(guidStr, out parsed)) {
                                            if (seen.Add(parsed)) guids.Add(parsed);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch {}

        // 3. Fallback standard profiles only if no primary connection profile exists
        bool hasHighPriorityService = false;
        foreach (Guid g in guids) {
            if (GetServicePriority(g) >= 70) {
                hasHighPriorityService = true;
                break;
            }
        }

        if (!hasHighPriorityService) {
            string[] standardProfiles = new string[] {
                "0000110b-0000-1000-8000-00805f9b34fb", // Audio Sink (A2DP)
                "0000111e-0000-1000-8000-00805f9b34fb", // Hands-Free (HFP)
                "00001124-0000-1000-8000-00805f9b34fb", // Human Interface Device (HID)
                "0000110a-0000-1000-8000-00805f9b34fb", // Audio Source
                "00001108-0000-1000-8000-00805f9b34fb", // Headset (HSP)
                "0000110c-0000-1000-8000-00805f9b34fb", // A/V Remote Control Target
                "0000110e-0000-1000-8000-00805f9b34fb"  // A/V Remote Control
            };
            foreach (string prof in standardProfiles) {
                Guid g = new Guid(prof);
                if (seen.Add(g)) guids.Add(g);
            }
        }

        guids.Sort((a, b) => {
            int scoreA = GetServicePriority(a);
            int scoreB = GetServicePriority(b);
            return scoreB.CompareTo(scoreA);
        });

        return guids;
    }

    private static bool IsConnectionProfile(Guid g) {
        return GetServicePriority(g) >= 70;
    }

    private static int ConnectDevice(ulong address, string cleanHex) {
        try {
            // Check if already connected
            if (GetDeviceConnectionState(address) == 1) {
                CompleteSuccess("Connected");
                return 0;
            }

            BLUETOOTH_DEVICE_INFO btdi = new BLUETOOTH_DEVICE_INFO();
            btdi.dwSize = (uint)Marshal.SizeOf(typeof(BLUETOOTH_DEVICE_INFO));
            btdi.Address = address;

            List<Guid> allServices = GetDeviceServices(address, cleanHex);
            if (allServices.Count == 0) {
                Console.WriteLine("Timeout");
                return 1;
            }

            // Only attempt profiles that actually initiate connection (A2DP, HFP, HID, Audio Source, HSP)
            List<Guid> services = new List<Guid>();
            foreach (Guid g in allServices) {
                if (IsConnectionProfile(g)) {
                    services.Add(g);
                }
            }
            if (services.Count == 0) {
                services = allServices;
            }

            _operationComplete = false;
            _exitOnce = 0;

            // Start background watcher to detect connection early
            var watcherThread = new Thread(() => {
                while (!_operationComplete) {
                    if (GetDeviceConnectionState(address) == 1) {
                        CompleteSuccess("Connected");
                        return;
                    }
                    Thread.Sleep(100);
                }
            });
            watcherThread.IsBackground = true;
            watcherThread.Start();

            // Try connection profiles in prioritized order
            bool hasCycledPrimary = false;
            foreach (Guid g in services) {
                if (_operationComplete) break;

                Guid currentGuid = g;
                uint res = BluetoothSetServiceState(IntPtr.Zero, ref btdi, ref currentGuid, 1u);
                if (res == 87 && !hasCycledPrimary) {
                    // ERROR_INVALID_PARAMETER: profile is already enabled.
                    // Cycle once on the highest-priority profile to trigger Windows outbound connection
                    hasCycledPrimary = true;
                    BluetoothSetServiceState(IntPtr.Zero, ref btdi, ref currentGuid, 0u);
                    Thread.Sleep(100);
                    if (_operationComplete) break;
                    BluetoothSetServiceState(IntPtr.Zero, ref btdi, ref currentGuid, 1u);
                }

                // Poll early for connection (up to 2.5s for top primary profile, 500ms for secondary/ancillary profiles)
                int prio = GetServicePriority(g);
                int pollLimit = (!hasCycledPrimary || prio == 100) ? 2500 : 500;
                int pollElapsed = 0;
                while (pollElapsed < pollLimit) {
                    if (_operationComplete) break;
                    if (GetDeviceConnectionState(address) == 1) {
                        CompleteSuccess("Connected");
                        return 0;
                    }
                    Thread.Sleep(150);
                    pollElapsed += 150;
                }

                if (_operationComplete) break;
            }

            if (_operationComplete || GetDeviceConnectionState(address) == 1) {
                CompleteSuccess("Connected");
                return 0;
            }

            // Fallback: trigger RFCOMM discovery only if device has no primary audio or input profiles
            bool hasAudioOrInput = false;
            foreach (Guid g in services) {
                if (GetServicePriority(g) >= 80) {
                    hasAudioOrInput = true;
                    break;
                }
            }

            if (!hasAudioOrInput) {
                try {
                    var op = BluetoothDevice.FromBluetoothAddressAsync(address);
                    var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
                    if (task.Wait(800) && task.Result != null) {
                        var btDev = task.Result;
                        if (btDev.ConnectionStatus == BluetoothConnectionStatus.Connected) {
                            try { btDev.Dispose(); } catch {}
                            CompleteSuccess("Connected");
                            return 0;
                        }

                        var rfcommOp = btDev.GetRfcommServicesAsync();
                        var rfcommTask = System.WindowsRuntimeSystemExtensions.AsTask(rfcommOp);
                        int rfcommElapsed = 0;
                        while (rfcommElapsed < 1500) {
                            if (_operationComplete) break;
                            if (GetDeviceConnectionState(address) == 1) {
                                try { btDev.Dispose(); } catch {}
                                CompleteSuccess("Connected");
                                return 0;
                            }
                            if (rfcommTask.Wait(200)) break;
                            rfcommElapsed += 200;
                        }
                        try { btDev.Dispose(); } catch {}
                    }
                } catch {}
            }

            // Final polling loop (up to 1.5s)
            int finalElapsed = 0;
            while (finalElapsed < 1500) {
                if (_operationComplete) break;
                if (GetDeviceConnectionState(address) == 1) {
                    CompleteSuccess("Connected");
                    return 0;
                }
                Thread.Sleep(150);
                finalElapsed += 150;
            }

            _operationComplete = true;
            Console.WriteLine("Timeout");
            return 1;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 2;
        }
    }

    private static int DisconnectDevice(ulong address, string cleanHex) {
        try {
            // Check if already disconnected
            if (GetDeviceConnectionState(address) == 0) {
                CompleteSuccess("Disconnected");
                return 0;
            }

            BLUETOOTH_DEVICE_INFO btdi = new BLUETOOTH_DEVICE_INFO();
            btdi.dwSize = (uint)Marshal.SizeOf(typeof(BLUETOOTH_DEVICE_INFO));
            btdi.Address = address;

            // Enumerate installed services
            var servicesToDisable = new List<Guid>();
            var seen = new HashSet<Guid>();

            uint numServices = 0;
            BluetoothEnumerateInstalledServices(IntPtr.Zero, ref btdi, ref numServices, null);
            if (numServices > 0) {
                byte[] buffer = new byte[numServices * 16];
                if (BluetoothEnumerateInstalledServices(IntPtr.Zero, ref btdi, ref numServices, buffer) == 0) {
                    for (int i = 0; i < numServices; i++) {
                        byte[] single = new byte[16];
                        Array.Copy(buffer, i * 16, single, 0, 16);
                        var g = new Guid(single);
                        if (seen.Add(g)) servicesToDisable.Add(g);
                    }
                }
            }

            // Fall back to standard profiles if no primary connection profiles were found in installed services
            bool hasPrimaryProfile = false;
            foreach (Guid g in servicesToDisable) {
                if (GetServicePriority(g) >= 70) {
                    hasPrimaryProfile = true;
                    break;
                }
            }

            if (!hasPrimaryProfile) {
                string[] standardProfiles = new string[] {
                    "0000110b-0000-1000-8000-00805f9b34fb", // Audio Sink
                    "0000111e-0000-1000-8000-00805f9b34fb", // Hands-Free
                    "00001124-0000-1000-8000-00805f9b34fb", // HID
                    "0000110a-0000-1000-8000-00805f9b34fb", // Audio Source
                    "00001108-0000-1000-8000-00805f9b34fb", // Headset
                    "0000110c-0000-1000-8000-00805f9b34fb", // A/V Remote Control Target
                    "0000110e-0000-1000-8000-00805f9b34fb"  // A/V Remote Control
                };
                foreach (string prof in standardProfiles) {
                    Guid g = new Guid(prof);
                    if (seen.Add(g)) servicesToDisable.Add(g);
                }
            }

            // Prioritize primary connection services first (A2DP, HFP, HID...)
            servicesToDisable.Sort((a, b) => {
                int scoreA = GetServicePriority(a);
                int scoreB = GetServicePriority(b);
                return scoreB.CompareTo(scoreA);
            });

            _operationComplete = false;
            _exitOnce = 0;

            // Start background watcher to detect disconnection immediately
            var watcherThread = new Thread(() => {
                while (!_operationComplete) {
                    if (GetDeviceConnectionState(address) == 0) {
                        CompleteSuccess("Disconnected");
                        return;
                    }
                    Thread.Sleep(100);
                }
            });
            watcherThread.IsBackground = true;
            watcherThread.Start();

            // Disable services sequentially, checking early after each
            foreach (Guid g in servicesToDisable) {
                if (_operationComplete) break;

                Guid currentGuid = g;
                BluetoothSetServiceState(IntPtr.Zero, ref btdi, ref currentGuid, 0u);

                // Early check: after disabling this service, poll briefly up to 1000ms
                int elapsed = 0;
                while (elapsed < 1000) {
                    if (_operationComplete) break;
                    if (GetDeviceConnectionState(address) == 0) {
                        CompleteSuccess("Disconnected");
                        return 0;
                    }
                    Thread.Sleep(150);
                    elapsed += 150;
                }
            }

            // Final polling loop (up to 2 seconds)
            int finalWait = 0;
            while (finalWait < 2000) {
                if (_operationComplete) break;
                if (GetDeviceConnectionState(address) == 0) {
                    CompleteSuccess("Disconnected");
                    return 0;
                }
                Thread.Sleep(200);
                finalWait += 200;
            }

            _operationComplete = true;
            if (GetDeviceConnectionState(address) == 0) {
                CompleteSuccess("Disconnected");
                return 0;
            }

            Console.WriteLine("FailedToDisconnect");
            return 1;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 2;
        }
    }

    private static int GetDeviceStatus(ulong address) {
        try {
            var op = BluetoothDevice.FromBluetoothAddressAsync(address);
            var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
            if (task.Wait(2500) && task.Result != null) {
                Console.WriteLine(task.Result.ConnectionStatus == BluetoothConnectionStatus.Connected ? "Connected" : "Disconnected");
                return 0;
            }
            Console.WriteLine("Disconnected");
            return 0;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 2;
        }
    }

    private static string EscapeJson(string s) {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "");
    }

    private static int ListDevices() {
        try {
            var searchParams = new BLUETOOTH_DEVICE_SEARCH_PARAMS();
            searchParams.dwSize = (uint)Marshal.SizeOf(typeof(BLUETOOTH_DEVICE_SEARCH_PARAMS));
            searchParams.fReturnAuthenticated = true;
            searchParams.fReturnRemembered = true;
            searchParams.fReturnConnected = true;
            searchParams.fReturnUnknown = false;
            searchParams.fIssueInquiry = false;
            searchParams.hRadio = IntPtr.Zero;

            var deviceInfo = new BLUETOOTH_DEVICE_INFO();
            deviceInfo.dwSize = (uint)Marshal.SizeOf(typeof(BLUETOOTH_DEVICE_INFO));

            var results = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            IntPtr hFind = BluetoothFindFirstDevice(ref searchParams, ref deviceInfo);
            if (hFind != IntPtr.Zero) {
                try {
                    do {
                        string cleanHex = deviceInfo.Address.ToString("X12").ToUpperInvariant();
                        if (string.IsNullOrEmpty(cleanHex) || cleanHex == "000000000000") continue;
                        if (!seen.Add(cleanHex)) continue;

                        string name = (deviceInfo.szName ?? "").Trim();
                        if (string.IsNullOrEmpty(name)) name = "Bluetooth Device (" + cleanHex + ")";

                        string formattedMac = string.Format("{0}:{1}:{2}:{3}:{4}:{5}",
                            cleanHex.Substring(0, 2),
                            cleanHex.Substring(2, 2),
                            cleanHex.Substring(4, 2),
                            cleanHex.Substring(6, 2),
                            cleanHex.Substring(8, 2),
                            cleanHex.Substring(10, 2));

                        bool isConnected = deviceInfo.fConnected;
                        try {
                            var op = BluetoothDevice.FromBluetoothAddressAsync(deviceInfo.Address);
                            var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
                            if (task.Wait(400) && task.Result != null) {
                                isConnected = (task.Result.ConnectionStatus == BluetoothConnectionStatus.Connected);
                                try { task.Result.Dispose(); } catch {}
                            }
                        } catch {}

                        string jsonItem = string.Format(
                            "{{\"Id\":\"BTHENUM\\\\DEV_{0}\",\"Name\":\"{1}\",\"Address\":\"{2}\",\"IsConnected\":{3}}}",
                            cleanHex,
                            EscapeJson(name),
                            formattedMac,
                            isConnected ? "true" : "false"
                        );
                        results.Add(jsonItem);
                    } while (BluetoothFindNextDevice(hFind, ref deviceInfo));
                } finally {
                    BluetoothFindDeviceClose(hFind);
                }
            }

            try {
                string leSelector = BluetoothLEDevice.GetDeviceSelectorFromPairingState(true);
                var op = DeviceInformation.FindAllAsync(leSelector, new string[] { "System.Devices.Aep.IsConnected" });
                var task = System.WindowsRuntimeSystemExtensions.AsTask(op);
                if (task.Wait(400) && task.Result != null) {
                    foreach (var d in task.Result) {
                        ulong addr;
                        string cleanHex;
                        if (TryParseMac(d.Id, out addr, out cleanHex)) {
                            if (seen.Add(cleanHex)) {
                                bool isConn = false;
                                object connVal;
                                if (d.Properties.TryGetValue("System.Devices.Aep.IsConnected", out connVal) && connVal is bool) {
                                    isConn = (bool)connVal;
                                }
                                string formattedMac = string.Format("{0}:{1}:{2}:{3}:{4}:{5}",
                                    cleanHex.Substring(0, 2),
                                    cleanHex.Substring(2, 2),
                                    cleanHex.Substring(4, 2),
                                    cleanHex.Substring(6, 2),
                                    cleanHex.Substring(8, 2),
                                    cleanHex.Substring(10, 2));
                                results.Add(string.Format(
                                    "{{\"Id\":\"BTHENUM\\\\DEV_{0}\",\"Name\":\"{1}\",\"Address\":\"{2}\",\"IsConnected\":{3}}}",
                                    cleanHex,
                                    EscapeJson(d.Name),
                                    formattedMac,
                                    isConn ? "true" : "false"
                                ));
                            }
                        }
                    }
                }
            } catch {}

            Console.WriteLine("[" + string.Join(",", results.ToArray()) + "]");
            return 0;
        } catch (Exception) {
            Console.WriteLine("[]");
            return 1;
        }
    }

    static int Main(string[] args) {
        if (args.Length == 0) {
            return ScanWifi();
        }

        string cmd = args[0].ToLowerInvariant();
        if (cmd == "scan" || cmd == "wlan-scan") {
            return ScanWifi();
        }

        if (cmd == "devices" || cmd == "list-devices" || cmd == "bt-devices") {
            return ListDevices();
        }

        if (cmd == "connect" || cmd == "bt-connect" || cmd == "connect-device") {
            if (args.Length < 2) {
                Console.WriteLine("MissingMacAddress");
                return 1;
            }
            ulong addr;
            string cleanHex;
            if (!TryParseMac(args[1], out addr, out cleanHex)) {
                Console.WriteLine("InvalidMacAddress");
                return 1;
            }
            return ConnectDevice(addr, cleanHex);
        }

        if (cmd == "disconnect" || cmd == "bt-disconnect" || cmd == "disconnect-device") {
            if (args.Length < 2) {
                Console.WriteLine("MissingMacAddress");
                return 1;
            }
            ulong addr;
            string cleanHex;
            if (!TryParseMac(args[1], out addr, out cleanHex)) {
                Console.WriteLine("InvalidMacAddress");
                return 1;
            }
            return DisconnectDevice(addr, cleanHex);
        }

        if (cmd == "device-status" || cmd == "bt-device-status") {
            if (args.Length < 2) {
                Console.WriteLine("MissingMacAddress");
                return 1;
            }
            ulong addr;
            string cleanHex;
            if (!TryParseMac(args[1], out addr, out cleanHex)) {
                Console.WriteLine("InvalidMacAddress");
                return 1;
            }
            return GetDeviceStatus(addr);
        }

        string kindStr = args.Length > 1 ? args[1].ToLowerInvariant() : "";
        RadioKind kind = (kindStr == "bt" || kindStr == "bluetooth") ? RadioKind.Bluetooth : RadioKind.WiFi;

        if (cmd == "status" || cmd == "get") {
            return GetRadioStatus(kind);
        }

        if (cmd == "toggle") {
            string targetState = args.Length > 2 ? args[2] : null;
            return ToggleRadio(kind, targetState);
        }

        if (cmd == "on" || cmd == "off") {
            return ToggleRadio(kind, cmd);
        }

        return ScanWifi();
    }
}
