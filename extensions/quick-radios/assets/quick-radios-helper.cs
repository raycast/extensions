using System;
using System.Runtime.InteropServices;
using Windows.Devices.Radios;

// Minimal Wi-Fi helper for Quick Radios on Windows:
//   scan                  -> trigger an active 802.11 scan on every WLAN interface (WlanScan)
//   status wifi           -> print the Wi-Fi radio state (On / Off / NotFound)
//   toggle wifi [on|off]  -> set or flip the Wi-Fi radio state without admin rights
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

    static int Main(string[] args) {
        if (args.Length == 0) {
            return ScanWifi();
        }

        string cmd = args[0].ToLowerInvariant();
        if (cmd == "scan" || cmd == "wlan-scan") {
            return ScanWifi();
        }

        string kindStr = args.Length > 1 ? args[1].ToLowerInvariant() : "wifi";
        if (kindStr != "wifi") {
            Console.WriteLine("UnsupportedRadio");
            return 1;
        }

        if (cmd == "status" || cmd == "get") {
            return GetRadioStatus(RadioKind.WiFi);
        }

        if (cmd == "toggle") {
            string targetState = args.Length > 2 ? args[2] : null;
            return ToggleRadio(RadioKind.WiFi, targetState);
        }

        if (cmd == "on" || cmd == "off") {
            return ToggleRadio(RadioKind.WiFi, cmd);
        }

        Console.WriteLine("UnknownCommand");
        return 1;
    }
}
