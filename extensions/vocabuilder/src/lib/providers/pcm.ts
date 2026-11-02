/**
 * Raw PCM shape both speech APIs return (Gemini inline audio, OpenAI
 * `response_format: "pcm"`). Changing these does not change what the APIs
 * send; it only breaks the WAV wrapper.
 */
export const PCM_SAMPLE_RATE = 24000;
const PCM_NUM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

/** Wrap little-endian PCM samples in a 44-byte RIFF/WAVE header so `afplay` can play them. */
export function prependWavHeader(
  pcm: Buffer,
  sampleRate = PCM_SAMPLE_RATE,
  numChannels = PCM_NUM_CHANNELS,
  bitsPerSample = PCM_BITS_PER_SAMPLE,
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("prependWavHeader", () => {
    it("produces a buffer starting with RIFF header", () => {
      const wav = prependWavHeader(Buffer.alloc(100));
      expect(wav.length).toBe(144); // 44 header + 100 data
      expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
      expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
      expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
      expect(wav.toString("ascii", 36, 40)).toBe("data");
    });

    it("encodes the 24 kHz mono 16-bit contract by default", () => {
      const wav = prependWavHeader(Buffer.alloc(48));
      expect(wav.readUInt32LE(24)).toBe(24000);
      expect(wav.readUInt16LE(22)).toBe(1);
      expect(wav.readUInt16LE(34)).toBe(16);
    });

    it("encodes correct data size", () => {
      const wav = prependWavHeader(Buffer.alloc(200));
      expect(wav.readUInt32LE(40)).toBe(200);
    });

    it("encodes correct total file size in RIFF header", () => {
      const wav = prependWavHeader(Buffer.alloc(200));
      expect(wav.readUInt32LE(4)).toBe(200 + 44 - 8); // dataSize + headerSize - 8
    });
  });
}
