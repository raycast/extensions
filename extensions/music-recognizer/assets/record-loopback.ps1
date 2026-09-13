# WASAPI loopback recorder (inline C#, no external DLLs or binaries).
#
# Captures the system's default render device ("what you hear"), downmixes to
# mono, resamples to 16 kHz s16le and writes a WAV file - the exact input
# format the Shazam fingerprint algorithm expects.
#
# The extension prepends variable assignments ($RecorderDuration,
# $RecorderOutFile, $RecorderRate) before executing this script; the fallbacks
# below make it runnable standalone for debugging:
#   powershell -File record-loopback.ps1
if (-not (Test-Path variable:RecorderDuration)) { $RecorderDuration = 5 }
if (-not (Test-Path variable:RecorderOutFile)) { $RecorderOutFile = Join-Path (Get-Location) "capture.wav" }
if (-not (Test-Path variable:RecorderRate)) { $RecorderRate = 16000 }

# NOTE: Windows PowerShell 5.1 compiles Add-Type with the C# 5 compiler; the
# embedded code must avoid newer syntax (string interpolation, out var, etc.).
$src = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace MusicRecognizer
{
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumeratorComObject { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints_NotImpl();
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice
    {
        int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    }

    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioClient
    {
        int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr audioSessionGuid);
        int GetBufferSize(out int bufferFrameCount);
        int GetStreamLatency_NotImpl();
        int GetCurrentPadding(out int padding);
        int IsFormatSupported_NotImpl();
        int GetMixFormat(out IntPtr format);
        int GetDevicePeriod_NotImpl();
        int Start();
        int Stop();
        int Reset_NotImpl();
        int SetEventHandle_NotImpl();
        int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioCaptureClient
    {
        int GetBuffer(out IntPtr dataPtr, out int numFrames, out int flags, out long devicePosition, out long qpcPosition);
        int ReleaseBuffer(int numFramesRead);
        int GetNextPacketSize(out int numFramesInNextPacket);
    }

    public static class LoopbackRecorder
    {
        private static void Check(int hr, string what)
        {
            if (hr != 0) throw new InvalidOperationException(what + " failed with HRESULT 0x" + hr.ToString("X8"));
        }

        private static void WriteInt(byte[] b, int off, int v)
        {
            b[off] = (byte)(v & 0xFF);
            b[off + 1] = (byte)((v >> 8) & 0xFF);
            b[off + 2] = (byte)((v >> 16) & 0xFF);
            b[off + 3] = (byte)((v >> 24) & 0xFF);
        }

        private static void WriteShort(byte[] b, int off, short v)
        {
            b[off] = (byte)(v & 0xFF);
            b[off + 1] = (byte)((v >> 8) & 0xFF);
        }

        public static string Record(string outPath, int seconds, int targetRate)
        {
            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            IMMDevice device;
            Check(enumerator.GetDefaultAudioEndpoint(0, 1, out device), "GetDefaultAudioEndpoint"); // eRender, eMultimedia

            var iidAudioClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
            object clientObj;
            Check(device.Activate(ref iidAudioClient, 0x17, IntPtr.Zero, out clientObj), "IMMDevice.Activate"); // CLSCTX_ALL
            var client = (IAudioClient)clientObj;

            IntPtr fmt;
            Check(client.GetMixFormat(out fmt), "GetMixFormat");
            int formatTag = (ushort)Marshal.ReadInt16(fmt, 0);
            int channels = Marshal.ReadInt16(fmt, 2);
            int nativeRate = Marshal.ReadInt32(fmt, 4);
            int bits = Marshal.ReadInt16(fmt, 14);
            bool isFloat = formatTag == 3;
            if (formatTag == 0xFFFE) // WAVE_FORMAT_EXTENSIBLE -> check SubFormat guid
            {
                var sub = new byte[16];
                Marshal.Copy(new IntPtr(fmt.ToInt64() + 24), sub, 0, 16);
                isFloat = new Guid(sub) == new Guid("00000003-0000-0010-8000-00aa00389b71");
            }
            if (!(isFloat && bits == 32) && !(!isFloat && bits == 16))
                throw new NotSupportedException("Unsupported mix format: tag=" + formatTag + " bits=" + bits);

            // Shared mode + AUDCLNT_STREAMFLAGS_LOOPBACK, 1 s internal buffer
            Check(client.Initialize(0, 0x00020000, 10000000, 0, fmt, IntPtr.Zero), "IAudioClient.Initialize");

            var iidCapture = new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
            object captureObj;
            Check(client.GetService(ref iidCapture, out captureObj), "GetService(IAudioCaptureClient)");
            var capture = (IAudioCaptureClient)captureObj;

            var mono = new List<float>(nativeRate * (seconds + 1));
            Check(client.Start(), "IAudioClient.Start");
            long end = DateTime.UtcNow.Ticks + (long)seconds * 10000000L;
            while (DateTime.UtcNow.Ticks < end)
            {
                int packet;
                Check(capture.GetNextPacketSize(out packet), "GetNextPacketSize");
                if (packet == 0) { Thread.Sleep(5); continue; }

                IntPtr data; int frames; int flags; long dpos; long qpos;
                Check(capture.GetBuffer(out data, out frames, out flags, out dpos, out qpos), "GetBuffer");
                if ((flags & 0x2) != 0) // AUDCLNT_BUFFERFLAGS_SILENT
                {
                    for (int i = 0; i < frames; i++) mono.Add(0f);
                }
                else if (isFloat)
                {
                    var buf = new float[frames * channels];
                    Marshal.Copy(data, buf, 0, buf.Length);
                    for (int i = 0; i < frames; i++)
                    {
                        float sum = 0f;
                        for (int c = 0; c < channels; c++) sum += buf[i * channels + c];
                        mono.Add(sum / channels);
                    }
                }
                else
                {
                    var buf = new short[frames * channels];
                    Marshal.Copy(data, buf, 0, buf.Length);
                    for (int i = 0; i < frames; i++)
                    {
                        float sum = 0f;
                        for (int c = 0; c < channels; c++) sum += buf[i * channels + c] / 32768f;
                        mono.Add(sum / channels);
                    }
                }
                Check(capture.ReleaseBuffer(frames), "ReleaseBuffer");
            }
            client.Stop();

            // Linear resample nativeRate -> targetRate, downmixed mono, s16le
            double ratio = (double)nativeRate / targetRate;
            int outLen = (int)(mono.Count / ratio);
            var pcm = new short[outLen];
            double sumSq = 0;
            for (int i = 0; i < outLen; i++)
            {
                double pos = i * ratio;
                int i0 = (int)pos;
                int i1 = (i0 + 1 < mono.Count) ? i0 + 1 : i0;
                double frac = pos - i0;
                double s = mono[i0] + (mono[i1] - mono[i0]) * frac;
                if (s > 1.0) s = 1.0;
                if (s < -1.0) s = -1.0;
                pcm[i] = (short)(s * 32767.0);
                sumSq += s * s;
            }

            var bytes = new byte[44 + pcm.Length * 2];
            Array.Copy(System.Text.Encoding.ASCII.GetBytes("RIFF"), 0, bytes, 0, 4);
            WriteInt(bytes, 4, 36 + pcm.Length * 2);
            Array.Copy(System.Text.Encoding.ASCII.GetBytes("WAVE"), 0, bytes, 8, 4);
            Array.Copy(System.Text.Encoding.ASCII.GetBytes("fmt "), 0, bytes, 12, 4);
            WriteInt(bytes, 16, 16);
            WriteShort(bytes, 20, 1);  // PCM
            WriteShort(bytes, 22, 1);  // mono
            WriteInt(bytes, 24, targetRate);
            WriteInt(bytes, 28, targetRate * 2);
            WriteShort(bytes, 32, 2);  // block align
            WriteShort(bytes, 34, 16); // bits per sample
            Array.Copy(System.Text.Encoding.ASCII.GetBytes("data"), 0, bytes, 36, 4);
            WriteInt(bytes, 40, pcm.Length * 2);
            Buffer.BlockCopy(pcm, 0, bytes, 44, pcm.Length * 2);
            File.WriteAllBytes(outPath, bytes);

            double capturedSec = (double)mono.Count / nativeRate;
            double rms = outLen > 0 ? Math.Sqrt(sumSq / outLen) : 0;
            return string.Format(System.Globalization.CultureInfo.InvariantCulture,
                "OK nativeRate={0} channels={1} float={2} capturedSec={3:F2} outSamples={4} rms={5:F4} file={6}",
                nativeRate, channels, isFloat, capturedSec, outLen, rms, outPath);
        }
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'MusicRecognizer.LoopbackRecorder').Type) {
    Add-Type -TypeDefinition $src -Language CSharp
}
[MusicRecognizer.LoopbackRecorder]::Record($RecorderOutFile, $RecorderDuration, $RecorderRate)
