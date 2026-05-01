import {
  parseListOutput,
  parseCurrentOutput,
  formatToCliArg,
} from "../audio-format";

describe("audio-format CLI parser", () => {
  test("parseListOutput extracts formats from CLI JSON", () => {
    const stdout = JSON.stringify({
      items: [
        {
          uid: "44100-16-int",
          title: "✓ 16-bit Integer · 44.1 kHz",
          subtitle: "Set DAC X to 16-bit Integer · 44.1 kHz",
          arg: "44100 16 int",
        },
        {
          uid: "96000-24-int",
          title: "24-bit Integer · 96 kHz",
          subtitle: "Set DAC X to 24-bit Integer · 96 kHz",
          arg: "96000 24 int",
        },
      ],
    });

    expect(parseListOutput(stdout)).toEqual([
      {
        rate: 44100,
        bits: 16,
        isFloat: false,
        isCurrent: true,
        label: "16-bit Integer · 44.1 kHz",
      },
      {
        rate: 96000,
        bits: 24,
        isFloat: false,
        isCurrent: false,
        label: "24-bit Integer · 96 kHz",
      },
    ]);
  });

  test("parseListOutput handles empty list", () => {
    const stdout = JSON.stringify({
      items: [{ title: "No formats available", valid: false }],
    });
    expect(parseListOutput(stdout)).toEqual([]);
  });

  test("parseListOutput throws on non-JSON input", () => {
    expect(() => parseListOutput("not json")).toThrow();
  });

  test("parseCurrentOutput extracts device + label", () => {
    const stdout = "Built-in Output: 24-bit Integer · 96 kHz\n";
    expect(parseCurrentOutput(stdout)).toEqual({
      device: "Built-in Output",
      label: "24-bit Integer · 96 kHz",
    });
  });

  test("parseCurrentOutput returns null on unparseable input", () => {
    expect(parseCurrentOutput("garbage")).toBeNull();
  });

  test("formatToCliArg builds args array", () => {
    expect(formatToCliArg({ rate: 96000, bits: 24, isFloat: false })).toEqual([
      "set",
      "96000",
      "24",
      "int",
    ]);
    expect(formatToCliArg({ rate: 96000, bits: 32, isFloat: true })).toEqual([
      "set",
      "96000",
      "32",
      "float",
    ]);
  });
});
