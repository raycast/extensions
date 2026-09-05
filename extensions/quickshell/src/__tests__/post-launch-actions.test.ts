import { describe, expect, it } from "vitest";
import { buildCompanionArguments, buildOpenUrlInvocation, runPostLaunchActions } from "../lib/post-launch-actions";

describe("post-launch-actions", () => {
  it("expands folder placeholders in companion arguments", () => {
    expect(buildCompanionArguments("{folder}", "C:\\Projects\\web")).toEqual(["C:\\Projects\\web"]);
    expect(buildCompanionArguments(".", "C:\\Projects\\web")).toEqual(["C:\\Projects\\web"]);
    expect(buildCompanionArguments("-n {folder}", "C:\\Projects\\web")).toEqual(["-n", "C:\\Projects\\web"]);
    expect(buildCompanionArguments('--title "My Project"', "C:\\Projects\\web")).toEqual(["--title", "My Project"]);
    expect(buildCompanionArguments("--profile John's --reuse-window", "C:\\Projects\\web")).toEqual([
      "--profile",
      "John's",
      "--reuse-window",
    ]);
  });

  it("opens URL metacharacters as data without a command shell", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    try {
      const opened: string[] = [];
      const url = "https://localhost:5173/?next=a&mode=b%20c#done";
      const invocation = buildOpenUrlInvocation(url);

      const result = await runPostLaunchActions(
        { companions: [], devServerUrl: url },
        {
          openUrl: async (value) => {
            opened.push(value);
          },
        },
      );

      expect(invocation).toEqual({ executable: "explorer.exe", args: [url] });
      expect(invocation.executable).not.toBe("cmd.exe");
      expect(opened).toEqual([url]);
      expect(result.devServerOpened).toBe(true);
    } finally {
      Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    }
  });

  it("executes only companions present in the authorized effects plan", async () => {
    const launched: string[] = [];

    const result = await runPostLaunchActions(
      {
        companions: [
          {
            companionId: "second",
            executablePath: process.execPath,
            arguments: "--project {folder}",
            workingDirectory: "C:\\Projects\\web",
          },
        ],
        devServerUrl: null,
      },
      {
        launchCompanion: async (effect) => {
          launched.push(effect.companionId);
        },
      },
    );

    expect(launched).toEqual(["second"]);
    expect(result.companionOpened).toBe(true);
  });
});
