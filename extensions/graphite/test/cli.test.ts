import { describe, expect, it } from "vitest";
import { CommandError, parseShellEnv, stripAnsi, summarizeOutput } from "../src/lib/cli";

describe("parseShellEnv", () => {
  const marker = "__TEST_ENV__";

  it("keeps only supported variables between two markers", () => {
    const output = `${marker}\nPATH=/fake/bin\nGH_TOKEN=FAKE_TOKEN_123\nHOME=/fake/home\nSECRET_THING=fake\n${marker}`;
    expect(parseShellEnv(output, marker)).toEqual({ PATH: "/fake/bin", GH_TOKEN: "FAKE_TOKEN_123" });
  });

  it("preserves equals signs in values", () => {
    expect(parseShellEnv(`${marker}\nGH_HOST=a=b\n${marker}`, marker)).toEqual({ GH_HOST: "a=b" });
  });

  it.each([
    { label: "one marker", output: `${marker}\nPATH=/fake/bin` },
    { label: "no markers", output: "PATH=/fake/bin" },
  ])("rejects incomplete output with $label", ({ output }) => {
    expect(parseShellEnv(output, marker)).toBeUndefined();
  });

  it("ignores lines without equals signs", () => {
    expect(parseShellEnv(`${marker}\nstartup message\nPATH=/fake/bin\n${marker}`, marker)).toEqual({
      PATH: "/fake/bin",
    });
  });

  it("ignores invalid variable names", () => {
    expect(parseShellEnv(`${marker}\n1PATH=fake\nGH-HOST=fake\n GH_TOKEN=fake\n=empty\n${marker}`, marker)).toEqual({});
  });

  it("ignores startup noise and assignments outside the markers", () => {
    expect(
      parseShellEnv(
        `Loading shell...\nGH_TOKEN=FAKE_OUTSIDE\n${marker}\nPATH=/fake/bin\n${marker}\nGH_HOST=outside`,
        marker,
      ),
    ).toEqual({ PATH: "/fake/bin" });
  });
});

describe("stripAnsi", () => {
  it("removes color codes while preserving text", () => {
    expect(stripAnsi("\u001b[31mFailure\u001b[0m: try again")).toBe("Failure: try again");
  });
});

describe("summarizeOutput", () => {
  it("keeps the last N non-empty trimmed lines", () => {
    expect(summarizeOutput(" first \n\n second \n \n third \n fourth \n", 2)).toBe("third\nfourth");
  });
});

describe("CommandError.output", () => {
  it("joins trimmed stdout and stderr with a blank line", () => {
    expect(new CommandError("Failed.", " stdout \n", " stderr \n", false).output).toBe("stdout\n\nstderr");
  });

  it.each([
    { label: "stdout only", stdout: "result", stderr: "", expected: "result" },
    { label: "stderr only", stdout: "", stderr: "diagnostic", expected: "diagnostic" },
    { label: "no output", stdout: "", stderr: "", expected: "Failed." },
    { label: "whitespace only", stdout: " \n", stderr: "\t", expected: "Failed." },
  ])("handles $label", ({ stdout, stderr, expected }) => {
    expect(new CommandError("Failed.", stdout, stderr, false).output).toBe(expected);
  });
});
