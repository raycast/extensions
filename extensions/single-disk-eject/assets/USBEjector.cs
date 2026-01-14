using System;
using System.Text;
using System.Runtime.InteropServices;

public class USBEjector {
    // Return codes from Config Manager
    const int CR_SUCCESS = 0x00000000;
    
    // PnP Veto Types (Reasons why eject failed)
    public enum PNP_VETO_TYPE {
        Ok = 0,
        TypeUnknown,
        LegacyDevice,
        PendingClose,
        WindowsApp,
        WindowsService,
        OutstandingOpen,
        Device,
        Driver,
        IllegalDeviceRequest,
        InsufficientPower,
        NonDisableable,
        LegacyDriver,
        InsufficientRights
    }

    [DllImport("cfgmgr32.dll", CharSet = CharSet.Unicode)]
    static extern int CM_Locate_DevNodeW(out int pdnDevInst, string pDeviceID, int ulFlags);

    [DllImport("cfgmgr32.dll", CharSet = CharSet.Unicode)]
    static extern int CM_Request_Device_EjectW(int dnDevInst, out PNP_VETO_TYPE pVetoType, StringBuilder pszVetoName, int ulNameLength, int ulFlags);

    // Function to navigate up the PnP tree
    [DllImport("cfgmgr32.dll", SetLastError = true)]
    static extern int CM_Get_Parent(out int pdnDevInst, int dnDevInst, int ulFlags);

    public static void Eject(string diskDeviceId) {
        int diskDevInst;
        int parentDevInst;
        
        // 1. Locate the Disk Node (USBSTOR\DISK...)
        int result = CM_Locate_DevNodeW(out diskDevInst, diskDeviceId, 0);
        if (result != CR_SUCCESS) {
            throw new Exception(string.Format("Device not found: {0}", diskDeviceId));
        }

        // 2. Climb up to the Parent (USB Mass Storage Device - USB\VID...)
        //    This is the "Safe Removal" target that controls the whole stack.
        result = CM_Get_Parent(out parentDevInst, diskDevInst, 0);
        
        // If we can't find a parent (unlikely), fallback to the disk itself
        int targetDevInst = (result == CR_SUCCESS) ? parentDevInst : diskDevInst;

        PNP_VETO_TYPE vetoType;
        StringBuilder vetoName = new StringBuilder(1024);

        // 3. Request Eject on the Parent
        result = CM_Request_Device_EjectW(targetDevInst, out vetoType, vetoName, 1024, 0);

        if (result != CR_SUCCESS || vetoType != PNP_VETO_TYPE.Ok) {
            // Throw a descriptive error that Raycast can show to the user
            string blocker = vetoName.ToString();
            string msg = string.Format("Unsafe to eject. Vetoed by: {0}", vetoType);
            
            if (!string.IsNullOrEmpty(blocker)) {
                msg += string.Format(" ({0})", blocker);
            }
            
            throw new Exception(msg);
        }
    }
}
