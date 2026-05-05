import { describe, expect, it, vi } from "vitest";
import {
  AudioBackend,
  AudioDevice,
  buildAudioDeviceState,
  normalizeDeviceName,
  switchAudioDevicePair,
} from "../src/audio";

describe("normalizeDeviceName", () => {
  it("normalizes built-in and headphone endpoint suffixes", () => {
    expect(normalizeDeviceName("MacBook Air Microphone")).toBe("MacBook Air");
    expect(normalizeDeviceName("MacBook Air Speakers")).toBe("MacBook Air");
    expect(normalizeDeviceName("AirPods Pro 3 Headphones")).toBe("AirPods Pro 3");
  });
});

describe("buildAudioDeviceState", () => {
  const inputs = [
    createAudioDevice("input", 1, "Poly Blackwire 3325 Series"),
    createAudioDevice("input", 2, "BlackHole 2ch"),
    createAudioDevice("input", 3, "MacBook Air Microphone"),
  ];
  const outputs = [
    createAudioDevice("output", 4, "DELL U3415W"),
    createAudioDevice("output", 5, "Poly Blackwire 3325 Series"),
    createAudioDevice("output", 6, "BlackHole 2ch"),
    createAudioDevice("output", 7, "MacBook Air Speakers"),
  ];

  it("lists only non-virtual paired devices", () => {
    const state = buildAudioDeviceState(inputs, outputs, inputs[2], outputs[3]);

    expect(state.pairs.map((pair) => pair.displayName)).toEqual(["MacBook Air", "Poly Blackwire 3325 Series"]);
    expect(state.inputDevices.map((device) => device.name)).toEqual([
      "BlackHole 2ch",
      "MacBook Air Microphone",
      "Poly Blackwire 3325 Series",
    ]);
    expect(state.outputDevices.map((device) => device.name)).toEqual([
      "BlackHole 2ch",
      "DELL U3415W",
      "MacBook Air Speakers",
      "Poly Blackwire 3325 Series",
    ]);
  });

  it("keeps alphabetical order while marking the current paired device", () => {
    const state = buildAudioDeviceState(inputs, outputs, inputs[0], outputs[1]);

    expect(state.pairs.map((pair) => pair.displayName)).toEqual(["MacBook Air", "Poly Blackwire 3325 Series"]);
    expect(state.pairs[1]).toMatchObject({
      displayName: "Poly Blackwire 3325 Series",
      isCurrent: true,
    });
    expect(state.currentPair?.displayName).toBe("Poly Blackwire 3325 Series");
  });

  it("marks mixed current devices without pinning partial devices", () => {
    const state = buildAudioDeviceState(inputs, outputs, inputs[2], outputs[1]);

    expect(state.isMixedCurrent).toBe(true);
    expect(state.currentPair).toBeUndefined();
    expect(state.pairs.every((pair) => !pair.isCurrent)).toBe(true);
  });

  it("groups duplicate normalized names as one item using the first pair", () => {
    const state = buildAudioDeviceState(
      [createAudioDevice("input", 10, "Studio Microphone"), createAudioDevice("input", 11, "Studio Input")],
      [createAudioDevice("output", 12, "Studio Speakers"), createAudioDevice("output", 13, "Studio Output")],
      undefined,
      undefined,
    );

    expect(state.pairs).toHaveLength(1);
    expect(state.pairs[0]).toMatchObject({
      displayName: "Studio",
      inputName: "Studio Microphone",
      outputName: "Studio Speakers",
    });
  });
});

describe("switchAudioDevicePair", () => {
  it("sets output then input", async () => {
    const setDevice = vi.fn<AudioBackend["setDevice"]>().mockResolvedValue(undefined);
    const backend = createMockBackend(setDevice);

    await switchAudioDevicePair(
      backend,
      {
        id: "MacBook Air",
        displayName: "MacBook Air",
        input: createAudioDevice("input", 1, "MacBook Air Microphone"),
        output: createAudioDevice("output", 2, "MacBook Air Speakers"),
        inputName: "MacBook Air Microphone",
        outputName: "MacBook Air Speakers",
        isCurrent: false,
      },
      createAudioDevice("input", 3, "Poly Blackwire 3325 Series"),
      createAudioDevice("output", 4, "Poly Blackwire 3325 Series"),
    );

    expect(setDevice).toHaveBeenNthCalledWith(1, "output", createAudioDevice("output", 2, "MacBook Air Speakers"));
    expect(setDevice).toHaveBeenNthCalledWith(2, "input", createAudioDevice("input", 1, "MacBook Air Microphone"));
  });

  it("rolls back previous output and input when switching fails", async () => {
    const error = new Error("input failed");
    const setDevice = vi
      .fn<AudioBackend["setDevice"]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const backend = createMockBackend(setDevice);

    await expect(
      switchAudioDevicePair(
        backend,
        {
          id: "MacBook Air",
          displayName: "MacBook Air",
          input: createAudioDevice("input", 1, "MacBook Air Microphone"),
          output: createAudioDevice("output", 2, "MacBook Air Speakers"),
          inputName: "MacBook Air Microphone",
          outputName: "MacBook Air Speakers",
          isCurrent: false,
        },
        createAudioDevice("input", 3, "Poly Blackwire 3325 Series"),
        createAudioDevice("output", 4, "Poly Blackwire 3325 Series"),
      ),
    ).rejects.toThrow("input failed");

    expect(setDevice).toHaveBeenCalledWith("output", createAudioDevice("output", 4, "Poly Blackwire 3325 Series"));
    expect(setDevice).toHaveBeenCalledWith("input", createAudioDevice("input", 3, "Poly Blackwire 3325 Series"));
  });
});

function createMockBackend(setDevice: AudioBackend["setDevice"]): AudioBackend {
  return {
    listDevices: vi.fn(),
    getCurrentDevice: vi.fn(),
    setDevice,
  };
}

function createAudioDevice(type: "input" | "output", backendId: number, name: string): AudioDevice {
  return {
    id: `${type}:${backendId}`,
    backendId,
    uid: `${type}-${backendId}`,
    name,
    type,
  };
}
