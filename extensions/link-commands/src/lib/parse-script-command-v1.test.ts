import { describe, expect, it, vi } from "vitest";
import { parseScriptCommand } from "./parse-script-command";

vi.mock("@raycast/api", () => ({
  environment: { raycastVersion: "1.85.0" },
}));

const baseScript = `#!/bin/bash
# @raycast.schemaVersion 1
# @raycast.title Quit Flux
# @raycast.packageName Flux
`;

describe("parseScriptCommand deeplink (v1)", () => {
  it("emits v1 deeplink on Raycast 1.x", () => {
    const result = parseScriptCommand({
      path: "/fake/flux-quit.sh",
      body: baseScript,
      isExecutable: true,
    });
    expect(result).not.toBeUndefined();
    expect(result!.deeplink).toBe("raycast://script-commands/flux-quit");
  });

  it("includes titleSlug derived from title", () => {
    const result = parseScriptCommand({
      path: "/fake/flux-quit.sh",
      body: baseScript,
      isExecutable: true,
    });
    expect(result).not.toBeUndefined();
    expect(result!.titleSlug).toBe("quit-flux");
  });
});
