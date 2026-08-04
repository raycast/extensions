import { describe, expect, it } from "vitest";

import { parseEnvOutput } from "../src/lib/shellEnv";

const D = "__SPELLBOOK_ENV_DELIMITER__";

function wrap(entries: string[]): string {
  return `${D}${entries.join("\0")}\0${D}`;
}

describe("parseEnvOutput", () => {
  it("parses NUL-delimited entries", () => {
    expect(parseEnvOutput(wrap(["PATH=/usr/bin", "HOME=/Users/x"]))).toEqual({
      PATH: "/usr/bin",
      HOME: "/Users/x",
    });
  });

  it("preserves multi-line values without inventing junk keys", () => {
    const entries = ["MULTI=line1\nline2 has = sign", "PATH=/usr/bin"];
    expect(parseEnvOutput(wrap(entries))).toEqual({
      MULTI: "line1\nline2 has = sign",
      PATH: "/usr/bin",
    });
  });

  it("splits on the first equals sign only", () => {
    expect(parseEnvOutput(wrap(["A=b=c"]))).toEqual({ A: "b=c" });
  });

  it("returns undefined when both delimiters are missing", () => {
    expect(parseEnvOutput("PATH=/usr/bin")).toBeUndefined();
    expect(parseEnvOutput(`${D}PATH=/usr/bin`)).toBeUndefined();
  });

  it("returns undefined for an empty env section", () => {
    expect(parseEnvOutput(`${D}${D}`)).toBeUndefined();
  });
});
