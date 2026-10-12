import { describe, expect, it } from "vitest";
import { captureBrowserUrl } from "./capture.js";

describe("captureBrowserUrl", () => {
  it("adds the URL to the selected workspace and leaves it pending", async () => {
    const calls: string[][] = [];
    const result = await captureBrowserUrl({
      url: "https://example.com/article",
      title: "Article title",
      workspace: "browser-agents",
      runLearn: async (args) => {
        calls.push(args);
        return { stdout: "✓ Resource added to workspace", stderr: "", code: 0 };
      },
    });

    expect(calls).toEqual([
      [
        "add",
        "https://example.com/article",
        "--workspace",
        "browser-agents",
        "--title",
        "Article title",
      ],
    ]);
    expect(result).toEqual({ status: "saved", title: "Article title" });
  });

  it("reports duplicate URLs without treating them as a capture failure", async () => {
    const result = await captureBrowserUrl({
      url: "https://example.com/article",
      workspace: "browser-agents",
      runLearn: async () => ({
        stdout: "",
        stderr: 'Error: Resource "https://example.com/article" already exists',
        code: 1,
      }),
    });

    expect(result).toEqual({ status: "duplicate" });
  });
});
