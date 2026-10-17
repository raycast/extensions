import { describe, expect, it, vi } from "vitest";
import { parseScriptCommand } from "./parse-script-command";

vi.mock("@raycast/api", () => ({
  environment: { raycastVersion: "2.0.0" },
}));

const baseScript = `#!/bin/bash
# @raycast.schemaVersion 1
# @raycast.title Quit Flux
# @raycast.packageName Flux
`;

describe("parseScriptCommand deeplink (v2)", () => {
  it("emits v2 deeplink on Raycast 2.x", () => {
    const result = parseScriptCommand({
      path: "/fake/flux-quit.sh",
      body: baseScript,
      isExecutable: true,
    });
    expect(result).not.toBeUndefined();
    expect(result!.deeplink).toBe("raycast://extensions/raycast/script-commands/quit-flux");
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
