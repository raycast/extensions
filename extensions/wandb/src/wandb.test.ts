import { describe, expect, it } from "vitest";
import { authHeader, projectUrl, runUrl } from "./wandb";

describe("authHeader", () => {
  it("builds HTTP Basic with api:<key>", () => {
    expect(authHeader("secret")).toBe("Basic " + Buffer.from("api:secret").toString("base64"));
  });
});

describe("url builders", () => {
  it("builds a project url", () => {
    expect(projectUrl("remax-team", "remax")).toBe("https://wandb.ai/remax-team/remax");
  });

  it("builds a run url", () => {
    expect(runUrl("remax-team", "remax", "lm3b_pknostd2_mpo")).toBe(
      "https://wandb.ai/remax-team/remax/runs/lm3b_pknostd2_mpo",
    );
  });

  it("encodes special characters", () => {
    expect(projectUrl("my team", "a/b")).toBe("https://wandb.ai/my%20team/a%2Fb");
  });
});
