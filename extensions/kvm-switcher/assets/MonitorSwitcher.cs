using System;
using System.Runtime.InteropServices;

public class MonitorControl
{
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool SetVCPFeature(IntPtr hMonitor, byte bVCPCode, uint dwNewValue);

    [DllImport("user32.dll")]
    public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

    public delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdcMonitor, ref Rect lprcMonitor, IntPtr dwData);

    [StructLayout(LayoutKind.Sequential)]
    public struct Rect { public int Left, Top, Right, Bottom; }

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, out uint pdwNumberOfPhysicalMonitors);

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint dwPhysicalMonitorArraySize, [Out] PHYSICAL_MONITOR[] pPhysicalMonitorArray);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct PHYSICAL_MONITOR
    {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool DestroyPhysicalMonitors(uint dwPhysicalMonitorArraySize, [In] PHYSICAL_MONITOR[] pPhysicalMonitorArray);

    public static bool SetInput(uint inputCode)
    {
        bool success = false;

        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate (IntPtr hMonitor, IntPtr hdcMonitor, ref Rect lprcMonitor, IntPtr dwData)
        {

            uint monitorCount = 0;

            // actual number of physical monitors attached to this logical HMONITOR
            if (GetNumberOfPhysicalMonitorsFromHMONITOR(hMonitor, out monitorCount) && monitorCount > 0)
            {

                PHYSICAL_MONITOR[] pms = new PHYSICAL_MONITOR[monitorCount];

                if (GetPhysicalMonitorsFromHMONITOR(hMonitor, monitorCount, pms))
                {

                    // iterate through all physical displays and send the VCP KVM KVM command (0x60)
                    for (uint i = 0; i < monitorCount; i++)
                    {
                        if (SetVCPFeature(pms[i].hPhysicalMonitor, 0x60, inputCode))
                        {
                            success = true;
                        }
                    }

                    DestroyPhysicalMonitors(monitorCount, pms);
                }
            }
            return true; // Continue enumerating other logical monitors
        }, IntPtr.Zero);
        
        return success;
    }
}