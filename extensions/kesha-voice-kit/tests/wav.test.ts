import { describe, expect, it } from "vitest";
import { isSilentWav, wavPayloadFormat, findWavChunk } from "../src/lib/wav";

describe("isSilentWav", () => {
  it("detects silent and non-silent Float32 WAV files", () => {
    expect(
      isSilentWav(makeWav({ formatTag: 3, bits: 32, samples: [0, 0] })),
    ).toBe(true);
    expect(
      isSilentWav(makeWav({ formatTag: 3, bits: 32, samples: [0, 0.01] })),
    ).toBe(false);
  });

  it("detects silent and non-silent Int16 WAV files", () => {
    expect(
      isSilentWav(makeWav({ formatTag: 1, bits: 16, samples: [0, 0] })),
    ).toBe(true);
    expect(
      isSilentWav(makeWav({ formatTag: 1, bits: 16, samples: [0, 2000] })),
    ).toBe(false);
  });

  it("supports WAVE_FORMAT_EXTENSIBLE payload tags", () => {
    const wav = makeWav({
      formatTag: 0xfffe,
      payloadTag: 3,
      bits: 32,
      samples: [0, 0.02],
    });
    const fmt = findWavChunk(wav, "fmt ");
    expect(fmt).not.toBeNull();
    expect(wavPayloadFormat(wav, fmt!, 0xfffe)).toBe(3);
    expect(isSilentWav(wav)).toBe(false);
  });

  it("does not block on malformed or unsupported WAV files", () => {
    expect(isSilentWav(Buffer.from("nope"))).toBe(false);
    expect(isSilentWav(makeWav({ formatTag: 6, bits: 8, samples: [0] }))).toBe(
      false,
    );
  });

  it("does not throw when the data chunk is truncated", () => {
    const floatWav = makeWav({ formatTag: 3, bits: 32, samples: [0] });
    const floatData = findWavChunk(floatWav, "data");
    expect(floatData).not.toBeNull();
    floatWav.writeUInt32LE(floatData!.length + 4, floatData!.offset - 4);

    const intWav = makeWav({ formatTag: 1, bits: 16, samples: [0] });
    const intData = findWavChunk(intWav, "data");
    expect(intData).not.toBeNull();
    intWav.writeUInt32LE(intData!.length + 2, intData!.offset - 4);

    expect(() => isSilentWav(floatWav)).not.toThrow();
    expect(() => isSilentWav(intWav)).not.toThrow();
    expect(isSilentWav(floatWav)).toBe(true);
    expect(isSilentWav(intWav)).toBe(true);
  });
});

function makeWav(options: {
  formatTag: number;
  payloadTag?: number;
  bits: 16 | 32 | 8;
  samples: number[];
}): Buffer {
  const fmtLength = options.formatTag === 0xfffe ? 40 : 16;
  const bytesPerSample = options.bits / 8;
  const dataLength = options.samples.length * bytesPerSample;
  const wav = Buffer.alloc(12 + 8 + fmtLength + 8 + dataLength);
  let offset = 0;
  offset = writeAscii(wav, offset, "RIFF");
  wav.writeUInt32LE(wav.length - 8, offset);
  offset += 4;
  offset = writeAscii(wav, offset, "WAVE");
  offset = writeAscii(wav, offset, "fmt ");
  wav.writeUInt32LE(fmtLength, offset);
  offset += 4;
  const fmtOffset = offset;
  wav.writeUInt16LE(options.formatTag, offset);
  offset += 2;
  wav.writeUInt16LE(1, offset);
  offset += 2;
  wav.writeUInt32LE(48000, offset);
  offset += 4;
  wav.writeUInt32LE(48000 * bytesPerSample, offset);
  offset += 4;
  wav.writeUInt16LE(bytesPerSample, offset);
  offset += 2;
  wav.writeUInt16LE(options.bits, offset);
  offset += 2;
  if (fmtLength === 40) {
    wav.writeUInt16LE(22, offset);
    offset += 2;
    wav.writeUInt16LE(options.bits, offset);
    offset += 2;
    wav.writeUInt32LE(0, offset);
    offset += 4;
    wav.writeUInt32LE(options.payloadTag ?? options.formatTag, fmtOffset + 24);
    offset = fmtOffset + fmtLength;
  }
  offset = writeAscii(wav, offset, "data");
  wav.writeUInt32LE(dataLength, offset);
  offset += 4;
  for (const sample of options.samples) {
    if (options.bits === 32) {
      wav.writeFloatLE(sample, offset);
      offset += 4;
    } else if (options.bits === 16) {
      wav.writeInt16LE(sample, offset);
      offset += 2;
    } else {
      wav.writeUInt8(sample, offset);
      offset += 1;
    }
  }
  return wav;
}

function writeAscii(buffer: Buffer, offset: number, value: string): number {
  buffer.write(value, offset, "ascii");
  return offset + value.length;
}
