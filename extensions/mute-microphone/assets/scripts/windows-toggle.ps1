$AudioCode = @'
using System;
using System.Runtime.InteropServices;

namespace RaycastAudioToggle {
    [Guid("D666063F-1587-4E43-81F1-B948E807363F")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
        [PreserveSig] int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
        [PreserveSig] int GetState(out int pdwState);
    }
    
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    }
    
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
        [PreserveSig] int RegisterControlChangeNotify(IntPtr pNotify);
        [PreserveSig] int UnregisterControlChangeNotify(IntPtr pNotify);
        [PreserveSig] int GetChannelCount(out int pnChannelCount);
        [PreserveSig] int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig] int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        [PreserveSig] int GetMasterVolumeLevel(out float pfLevelDB);
        [PreserveSig] int GetMasterVolumeLevelScalar(out float pfLevel);
        [PreserveSig] int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig] int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
        [PreserveSig] int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        [PreserveSig] int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
        [PreserveSig] int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
        [PreserveSig] int VolumeStepUp(ref Guid pguidEventContext);
        [PreserveSig] int VolumeStepDown(ref Guid pguidEventContext);
        [PreserveSig] int QueryHardwareSupport(out uint pdwHardwareSupportMask);
        [PreserveSig] int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
    }
    
    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumeratorComObject { }
    
    public class MicController {
        private const int CLSCTX_ALL = 23;
        
        public static void ToggleMute() {
            IMMDeviceEnumerator deviceEnumerator = null;
            IMMDevice device = null;
            IAudioEndpointVolume endpointVolume = null;
            
            try {
                deviceEnumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                int hr = deviceEnumerator.GetDefaultAudioEndpoint(1, 0, out device);
                if (hr != 0) throw new Exception("Microphone not found");
                
                Guid IID_IAudioEndpointVolume = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object obj = null;
                hr = device.Activate(ref IID_IAudioEndpointVolume, CLSCTX_ALL, IntPtr.Zero, out obj);
                if (hr != 0) throw new Exception("Activate failed");
                
                endpointVolume = (IAudioEndpointVolume)obj;
                
                bool isMuted = false;
                endpointVolume.GetMute(out isMuted);
                
                Guid ctx = Guid.Empty;
                endpointVolume.SetMute(!isMuted, ref ctx);
                
                Console.WriteLine(isMuted ? "ON" : "MUTED");
            }
            finally {
                if (endpointVolume != null) Marshal.ReleaseComObject(endpointVolume);
                if (device != null) Marshal.ReleaseComObject(device);
                if (deviceEnumerator != null) Marshal.ReleaseComObject(deviceEnumerator);
            }
        }
    }
}
'@

if (-not ("RaycastAudioToggle.MicController" -as [type])) {
    Add-Type -TypeDefinition $AudioCode -Language CSharp
}

try {
    [RaycastAudioToggle.MicController]::ToggleMute()
}
catch {
    exit 1
}