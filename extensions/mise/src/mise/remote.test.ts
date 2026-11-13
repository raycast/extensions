import { describe, expect, it } from "vitest";
import { MiseOutputError } from "./exec";
import { parseRemote } from "./remote";
import fixture from "./fixtures/ls-remote.json";

describe("parseRemote", () => {
  it("keeps mise's oldest-to-newest order with release dates and URLs", () => {
    const versions = parseRemote(fixture);
    expect(versions.map((v) => v.version)).toEqual([
      "1.3",
      "1.4",
      "1.5",
      "1.6",
      "1.7",
      "1.7.1",
      "1.8.0",
      "1.8.1",
      "1.8.2",
    ]);
    expect(versions[versions.length - 1]).toEqual({
      version: "1.8.2",
      createdAt: "2026-06-20T14:11:27.0Z",
      releaseUrl: "https://github.com/jqlang/jq/releases/tag/jq-1.8.2",
    });
  });

  it("leaves createdAt and releaseUrl out when a backend does not report them", () => {
    expect(parseRemote([{ version: "26.8.2", created_at: "2026-09-09T00:00:00.0Z" }, { version: "1.0" }])).toEqual([
      { version: "26.8.2", createdAt: "2026-09-09T00:00:00.0Z" },
      { version: "1.0" },
    ]);
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseRemote({})).toThrow(MiseOutputError);
    expect(() => parseRemote([{ created_at: "x" }])).toThrow(/entry 0 is not a version/);
  });
});
