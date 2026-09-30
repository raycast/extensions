param(
    [Parameter(Mandatory=$true)]
    [string]$OutputPath,

    [Parameter(Mandatory=$true)]
    [string]$StopSignalPath,

    [int]$DeviceIndex = -1
)

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;

public class WaveRecorder {
    const uint WAVE_MAPPER = 0xFFFFFFFF;
    const uint CALLBACK_NULL = 0x00000000;
    const uint WHDR_DONE = 0x00000001;
    const uint WHDR_PREPARED = 0x00000002;

    [StructLayout(LayoutKind.Sequential)]
    public struct WAVEFORMATEX {
        public ushort wFormatTag;
        public ushort nChannels;
        public uint nSamplesPerSec;
        public uint nAvgBytesPerSec;
        public ushort nBlockAlign;
        public ushort wBitsPerSample;
        public ushort cbSize;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct WAVEHDR {
        public IntPtr lpData;
        public uint dwBufferLength;
        public uint dwBytesRecorded;
        public IntPtr dwUser;
        public uint dwFlags;
        public uint dwLoops;
        public IntPtr lpNext;
        public IntPtr reserved;
    }

    [DllImport("winmm.dll")]
    static extern uint waveInOpen(ref IntPtr phwi, uint uDeviceID, ref WAVEFORMATEX lpFormat, IntPtr dwCallback, IntPtr dwInstance, uint fdwOpen);
    [DllImport("winmm.dll")]
    static extern uint waveInPrepareHeader(IntPtr hwi, IntPtr lpWaveInHdr, uint uSize);
    [DllImport("winmm.dll")]
    static extern uint waveInUnprepareHeader(IntPtr hwi, IntPtr lpWaveInHdr, uint uSize);
    [DllImport("winmm.dll")]
    static extern uint waveInAddBuffer(IntPtr hwi, IntPtr lpWaveInHdr, uint uSize);
    [DllImport("winmm.dll")]
    static extern uint waveInStart(IntPtr hwi);
    [DllImport("winmm.dll")]
    static extern uint waveInStop(IntPtr hwi);
    [DllImport("winmm.dll")]
    static extern uint waveInReset(IntPtr hwi);
    [DllImport("winmm.dll")]
    static extern uint waveInClose(IntPtr hwi);

    const int SAMPLE_RATE = 16000;
    const int BITS = 16;
    const int CHANNELS = 1;
    const int NUM_BUFFERS = 8;
    const int BUFFER_MS = 100;

    static int hdrSize = Marshal.SizeOf(typeof(WAVEHDR));

    static uint ReadFlags(IntPtr hdrPtr) {
        // dwFlags is at offset 16 (4 IntPtr fields: lpData, dwBufferLength, dwBytesRecorded, dwUser...
        // actually: lpData=IntPtr, dwBufferLength=uint, dwBytesRecorded=uint, dwUser=IntPtr, dwFlags=uint)
        // On 64-bit: lpData(8) + dwBufferLength(4) + dwBytesRecorded(4) + dwUser(8) + dwFlags(4) = offset 24
        // On 32-bit: lpData(4) + dwBufferLength(4) + dwBytesRecorded(4) + dwUser(4) + dwFlags(4) = offset 16
        int offset = IntPtr.Size + 4 + 4 + IntPtr.Size;
        return (uint)Marshal.ReadInt32(hdrPtr, offset);
    }

    static uint ReadBytesRecorded(IntPtr hdrPtr) {
        // dwBytesRecorded is after lpData(IntPtr) + dwBufferLength(uint)
        int offset = IntPtr.Size + 4;
        return (uint)Marshal.ReadInt32(hdrPtr, offset);
    }

    static void WriteBytesRecorded(IntPtr hdrPtr, uint value) {
        int offset = IntPtr.Size + 4;
        Marshal.WriteInt32(hdrPtr, offset, (int)value);
    }

    static void WriteFlags(IntPtr hdrPtr, uint value) {
        int offset = IntPtr.Size + 4 + 4 + IntPtr.Size;
        Marshal.WriteInt32(hdrPtr, offset, (int)value);
    }

    public static string Record(string outputPath, string stopSignalPath, int deviceIndex) {
        uint deviceId = deviceIndex < 0 ? WAVE_MAPPER : (uint)deviceIndex;
        int bytesPerSample = CHANNELS * (BITS / 8);
        int bufferBytes = (SAMPLE_RATE * bytesPerSample * BUFFER_MS) / 1000;

        var format = new WAVEFORMATEX {
            wFormatTag = 1,
            nChannels = CHANNELS,
            nSamplesPerSec = SAMPLE_RATE,
            wBitsPerSample = BITS,
            nBlockAlign = (ushort)bytesPerSample,
            nAvgBytesPerSec = (uint)(SAMPLE_RATE * bytesPerSample),
            cbSize = 0
        };

        IntPtr hwi = IntPtr.Zero;
        uint result = waveInOpen(ref hwi, deviceId, ref format, IntPtr.Zero, IntPtr.Zero, CALLBACK_NULL);
        if (result != 0)
            throw new Exception("waveInOpen failed: error " + result);

        var allData = new MemoryStream();

        // Allocate headers and buffers in unmanaged memory so waveIn can write to them
        IntPtr[] hdrPtrs = new IntPtr[NUM_BUFFERS];
        IntPtr[] dataPtrs = new IntPtr[NUM_BUFFERS];

        for (int i = 0; i < NUM_BUFFERS; i++) {
            dataPtrs[i] = Marshal.AllocHGlobal(bufferBytes);
            hdrPtrs[i] = Marshal.AllocHGlobal(hdrSize);

            var hdr = new WAVEHDR {
                lpData = dataPtrs[i],
                dwBufferLength = (uint)bufferBytes,
                dwBytesRecorded = 0,
                dwUser = IntPtr.Zero,
                dwFlags = 0,
                dwLoops = 0,
                lpNext = IntPtr.Zero,
                reserved = IntPtr.Zero
            };
            Marshal.StructureToPtr(hdr, hdrPtrs[i], false);

            waveInPrepareHeader(hwi, hdrPtrs[i], (uint)hdrSize);
            waveInAddBuffer(hwi, hdrPtrs[i], (uint)hdrSize);
        }

        waveInStart(hwi);

        int fileCheckCounter = 0;
        bool stopping = false;

        while (!stopping) {
            for (int i = 0; i < NUM_BUFFERS; i++) {
                uint flags = ReadFlags(hdrPtrs[i]);
                if ((flags & WHDR_DONE) != 0) {
                    uint bytesRecorded = ReadBytesRecorded(hdrPtrs[i]);
                    if (bytesRecorded > 0) {
                        byte[] chunk = new byte[bytesRecorded];
                        Marshal.Copy(dataPtrs[i], chunk, 0, (int)bytesRecorded);
                        allData.Write(chunk, 0, chunk.Length);

                        // Compute RMS level for visualization
                        double sumSq = 0;
                        int samples = (int)bytesRecorded / 2;
                        for (int s = 0; s < samples; s++) {
                            short sample = BitConverter.ToInt16(chunk, s * 2);
                            double norm = sample / 32768.0;
                            sumSq += norm * norm;
                        }
                        double rms = Math.Sqrt(sumSq / Math.Max(samples, 1));
                        Console.Out.WriteLine("LEVEL:" + rms.ToString("F4"));
                        Console.Out.Flush();
                    }
                    // Clear done flag, reset bytes recorded, re-queue
                    WriteFlags(hdrPtrs[i], WHDR_PREPARED);
                    WriteBytesRecorded(hdrPtrs[i], 0);
                    waveInAddBuffer(hwi, hdrPtrs[i], (uint)hdrSize);
                }
            }

            fileCheckCounter++;
            if (fileCheckCounter >= 10) {
                fileCheckCounter = 0;
                if (File.Exists(stopSignalPath))
                    stopping = true;
            }

            if (!stopping)
                Thread.Sleep(50);
        }

        waveInStop(hwi);
        Thread.Sleep(200);
        waveInReset(hwi);

        // Collect remaining data
        for (int i = 0; i < NUM_BUFFERS; i++) {
            uint bytesRecorded = ReadBytesRecorded(hdrPtrs[i]);
            if (bytesRecorded > 0) {
                byte[] chunk = new byte[bytesRecorded];
                Marshal.Copy(dataPtrs[i], chunk, 0, (int)bytesRecorded);
                allData.Write(chunk, 0, chunk.Length);
            }
            waveInUnprepareHeader(hwi, hdrPtrs[i], (uint)hdrSize);
            Marshal.FreeHGlobal(hdrPtrs[i]);
            Marshal.FreeHGlobal(dataPtrs[i]);
        }

        waveInClose(hwi);

        byte[] pcmData = allData.ToArray();
        allData.Dispose();

        using (var fs = new FileStream(outputPath, FileMode.Create))
        using (var bw = new BinaryWriter(fs)) {
            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write((uint)(36 + pcmData.Length));
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));
            bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            bw.Write((uint)16);
            bw.Write((ushort)1);
            bw.Write((ushort)CHANNELS);
            bw.Write((uint)SAMPLE_RATE);
            bw.Write((uint)(SAMPLE_RATE * bytesPerSample));
            bw.Write((ushort)bytesPerSample);
            bw.Write((ushort)BITS);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write((uint)pcmData.Length);
            bw.Write(pcmData);
        }

        return "OK";
    }
}
"@

if (Test-Path $StopSignalPath) { Remove-Item $StopSignalPath -Force }
if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }

try {
    "recording" | Out-File -FilePath "$OutputPath.recording" -Encoding utf8 -NoNewline
    $result = [WaveRecorder]::Record($OutputPath, $StopSignalPath, $DeviceIndex)
    Remove-Item $StopSignalPath -Force -ErrorAction SilentlyContinue
    Remove-Item "$OutputPath.recording" -Force -ErrorAction SilentlyContinue
    Write-Output $result
}
catch {
    Remove-Item "$OutputPath.recording" -Force -ErrorAction SilentlyContinue
    Write-Error $_.Exception.Message
    exit 1
}
