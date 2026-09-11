import { describe, expect, it } from "vitest";
import { parseDefaultMicInfo } from "../src/lib/mic-info";

describe("parseDefaultMicInfo", () => {
  it("selects the default input device and metadata from nested system_profiler output", () => {
    const mic = parseDefaultMicInfo(
      JSON.stringify({
        SPAudioDataType: [
          {
            _name: "Display",
            _items: [
              {
                _name: "Studio Mic",
                coreaudio_default_audio_input_device: "spaudio_yes",
                coreaudio_device_srate: 48000,
                coreaudio_device_input: 1,
              },
            ],
          },
        ],
      }),
    );

    expect(mic).toEqual({
      name: "Studio Mic",
      sampleRate: 48000,
      channels: 1,
    });
  });

  it("falls back when output is malformed or has no default input", () => {
    expect(parseDefaultMicInfo("not json")).toEqual({
      name: "Default input device",
    });
    expect(
      parseDefaultMicInfo(JSON.stringify({ SPAudioDataType: [] })),
    ).toEqual({
      name: "Default input device",
    });
  });
});
