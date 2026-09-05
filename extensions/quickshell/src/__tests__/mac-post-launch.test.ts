import { afterEach, describe, expect, it } from "vitest";
import { buildCompanionLaunchInvocation, buildOpenUrlInvocation } from "../lib/post-launch-actions";
import { buildMacTransferOsascript } from "../lib/workspace-transfer-files";
import { inferCompanionPresetFromPath } from "../lib/companion-catalog";

describe("mac post-launch and transfer helpers", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
  });

  it("opens URLs with open on darwin", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    expect(buildOpenUrlInvocation("http://localhost:3000")).toEqual({
      executable: "open",
      args: ["http://localhost:3000"],
    });
  });

  it("launches .app companions via open --args on darwin", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    expect(buildCompanionLaunchInvocation("/Applications/Cursor.app", ["/Users/dev/app"])).toEqual({
      executable: "open",
      args: ["/Applications/Cursor.app", "--args", "/Users/dev/app"],
    });
    expect(buildCompanionLaunchInvocation("/System/Library/CoreServices/Finder.app", ["/Users/dev/app"])).toEqual({
      executable: "open",
      args: ["/Users/dev/app"],
    });
  });

  it("infers vscode from a Mac app path when platform is darwin", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    expect(inferCompanionPresetFromPath("/Applications/Visual Studio Code.app")).toBe("vscode");
  });

  it("builds macOS osascript transfer dialogs", () => {
    expect(buildMacTransferOsascript("save")).toContain("choose file name");
    expect(buildMacTransferOsascript("open")).toContain("choose file");
  });
});
