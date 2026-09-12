$AudioCode = @'
using System;
using System.Runtime.InteropServices;

namespace RaycastAudio {
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
        int NotImpl1(); int NotImpl2();
        int GetChannelCount(out int pnChannelCount);
        int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
        int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
        int GetMasterVolumeLevel(out float pfLevelDB);
        int GetMasterVolumeLevelScalar(out float pfLevel);
        int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);
        int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);
        int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
        int GetMute(out bool pbMute);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice {
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
        int NotImpl1(); int NotImpl2();
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator {
        int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollection ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    }

    [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceCollection {
        int GetCount(out int pcDevices);
        int Item(int nDevice, out IMMDevice ppDevice);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumeratorComObject { }

    public class Audio {
        static IAudioEndpointVolume Vol() {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            // dataFlow: 1 = eCapture, role: 0 = eConsole
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(1, 0, out dev));
            object obj = null;
            Guid iid = typeof(IAudioEndpointVolume).GUID;
            Marshal.ThrowExceptionForHR(dev.Activate(ref iid, 0, IntPtr.Zero, out obj));
            return (IAudioEndpointVolume)obj;
        }
        
        public static float GetVolume() { 
            float level = 0; 
            Vol().GetMasterVolumeLevelScalar(out level); 
            return level; 
        }

        public static bool GetMute() {
            bool muted = false;
            Vol().GetMute(out muted);
            return muted;
        }
    }
}
'@

if (-not ("RaycastAudio.Audio" -as [type])) {
    Add-Type -TypeDefinition $AudioCode -Language CSharp
}

try {
    $muted = [RaycastAudio.Audio]::GetMute()
    if ($muted) {
        Write-Output "0"
    } else {
        $vol = [RaycastAudio.Audio]::GetVolume()
        $level = [Math]::Round($vol * 100)
        Write-Output $level
    }
}
catch {
    exit 1
}
