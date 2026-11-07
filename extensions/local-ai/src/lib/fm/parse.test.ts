/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { FmError } from "./errors";
import { parseModels, parseTokenCount } from "./parse";

describe("parseModels", () => {
  it("reads the captured help fixture", () => {
    const help = readFileSync(join(__dirname, "__fixtures__", "respond-help.txt"), "utf8");
    expect(parseModels(help)).toEqual(["system"]);
  });

  it("reads every model line in the MODELS section", () => {
    const help = "USAGE\n  fm respond\n\n  MODELS\n    system   On-device\n    pcc  Private Cloud Compute\n";
    expect(parseModels(help)).toEqual(["system", "pcc"]);
  });

  it("stops at the next header or blank line", () => {
    const help = "MODELS\n  system  On-device\n\nOTHER\n  nope  x\n";
    expect(parseModels(help)).toEqual(["system"]);
  });

  it("falls back to system without a MODELS section", () => {
    expect(parseModels("USAGE\n  fm respond\n")).toEqual(["system"]);
  });
});

describe("parseTokenCount", () => {
  it("parses a bare integer", () => {
    expect(parseTokenCount("9\n")).toBe(9);
  });

  it("parses a labelled count", () => {
    expect(parseTokenCount("Token count: 412")).toBe(412);
  });

  it("throws an unknown FmError when no integer is present", () => {
    expect(() => parseTokenCount("")).toThrow(FmError);
    try {
      parseTokenCount("");
    } catch (error) {
      expect((error as FmError).kind).toBe("unknown");
    }
  });
});
