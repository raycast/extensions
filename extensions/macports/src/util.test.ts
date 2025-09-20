import { describe, expect, it } from "vitest";
import { extractInstalledPorts, extractPortDetails } from "./util";
import type { PortDetails } from "./types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestRun = {
  fileName: string;
  portName: string;
  expected: PortDetails;
};

const testRunsMap = new Map<string, TestRun>([
  [
    "cargo",
    {
      fileName: "cargo_port_info.txt",
      portName: "cargo",
      expected: {
        name: "cargo",
        description: "Cargo downloads your Rust project's dependencies and compiles your project.",
        homepage: "https://crates.io",
        maintainers: [
          {
            email: "mcalhoun@macports.org",
            github: "MarcusCalhoun-Lopez",
          },
        ],
        variants: ["mirror_all_architectures", "universal"],
        dependencies: ["curl", "libgit2", "libssh2", "zlib", "openssl3"],
        version: "0.85.0",
      },
    },
  ],
  [
    "cmake",
    {
      fileName: "cmake_port_info.txt",
      portName: "cmake",
      expected: {
        name: "cmake",
        description:
          "An extensible, open-source system that manages the build process in an operating system and compiler independent manner. Unlike many cross-platform systems, CMake is designed to be used in conjunction with the native build environment. The cmake release port is updated roughly every few months.",
        homepage: "https://cmake.org",
        maintainers: [
          {
            email: "michaelld@macports.org",
            github: "michaelld",
          },
          {
            email: "mascguy@macports.org",
            github: "mascguy",
          },
        ],
        variants: ["universal"],
        dependencies: ["libcxx", "curl", "expat", "zlib", "bzip2", "libarchive", "ncurses"],
        version: "3.31.3",
      },
    },
  ],
]);

describe("extractPortDetails", () => {
  for (const [portName, testRun] of testRunsMap.entries()) {
    it(`should extract port details correctly for ${portName}`, () => {
      const fileContent = readFileSync(join(__dirname, "test-files", testRun.fileName), "utf-8");
      const details = extractPortDetails(portName, fileContent);
      expect(details).toEqual(testRun.expected);
    });
  }
});

describe("extractInstalledPorts", () => {
  it("should return an empty array if no installed ports are found", () => {
    const cases = [
      {
        input: "No installed ports found",
        expected: [],
      },
      {
        input: "No ports installed",
        expected: [],
      },
    ];

    for (const testCase of cases) {
      const result = extractInstalledPorts(testCase.input);
      expect(result).toEqual(testCase.expected);
    }
  });

  it("should return an empty array if the input is empty", () => {
    const input = "";
    const result = extractInstalledPorts(input);
    expect(result).toEqual([]);
  });

  it("should return an array of installed ports", () => {
    const input = "cargo\ncmake\n";
    const result = extractInstalledPorts(input);
    expect(result).toEqual(["cargo", "cmake"]);
  });
});
