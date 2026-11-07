import { describe, expect, it } from "vitest";
import { buildCountTokensArgs, buildRespondArgs, type RespondOptions } from "./args";

const base: RespondOptions = {
  model: "system",
  creativity: "normal",
  useCase: "general",
  guardrails: "default",
  stream: true,
};

describe("buildRespondArgs", () => {
  it("builds precise, permissive, non-streaming system args", () => {
    expect(
      buildRespondArgs({
        model: "system",
        instructions: "Do X",
        creativity: "precise",
        useCase: "general",
        guardrails: "permissive",
        stream: false,
      }),
    ).toEqual([
      "respond",
      "--model=system",
      "--instructions=Do X",
      "--use-case",
      "general",
      "--guardrails",
      "permissive-content-transformations",
      "--greedy",
      "--no-stream",
    ]);
  });

  it("omits blank instructions", () => {
    expect(buildRespondArgs({ ...base, instructions: "  " })).toEqual([
      "respond",
      "--model=system",
      "--use-case",
      "general",
      "--guardrails",
      "default",
      "--stream",
    ]);
  });

  it("omits use-case and guardrails for non-system models", () => {
    expect(buildRespondArgs({ ...base, model: "pcc", instructions: "Do X", guardrails: "permissive" })).toEqual([
      "respond",
      "--model=pcc",
      "--instructions=Do X",
      "--stream",
    ]);
  });

  it("puts each image pair last", () => {
    const args = buildRespondArgs({ ...base, instructions: "Do X", imagePaths: ["/a.png"] });
    expect(args.slice(-1)).toEqual(["--image=/a.png"]);
    expect(args.filter((arg) => arg.startsWith("--image="))).toHaveLength(1);
  });
});

describe("buildCountTokensArgs", () => {
  it("keeps a dash-leading instruction as a single token", () => {
    expect(buildCountTokensArgs({ instructions: "- Be brief" })).toEqual([
      "count-tokens",
      "--quiet",
      "--instructions=- Be brief",
    ]);
    expect(buildRespondArgs({ ...base, instructions: "- Be brief" })).toContain("--instructions=- Be brief");
  });

  it("includes instructions", () => {
    expect(buildCountTokensArgs({ instructions: "Do X" })).toEqual(["count-tokens", "--quiet", "--instructions=Do X"]);
  });

  it("is quiet only without options", () => {
    expect(buildCountTokensArgs({})).toEqual(["count-tokens", "--quiet"]);
  });

  it("appends images last", () => {
    expect(buildCountTokensArgs({ instructions: "Do X", imagePaths: ["/a.png"] }).slice(-1)).toEqual([
      "--image=/a.png",
    ]);
  });
});
