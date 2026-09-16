import { describe, expect, it } from "vitest";
import {
  discoverDefaultProfileChoices,
  discoverWorkspaceTerminalChoices,
  invalidateTerminalCatalogCache,
  parseJsoncForTests,
} from "../lib/terminal-catalog";

describe("terminal-catalog", () => {
  it("returns workspace terminal choices on non-windows platforms", () => {
    invalidateTerminalCatalogCache();
    const choices = discoverWorkspaceTerminalChoices();
    expect(choices.some((choice) => choice.id === "default")).toBe(true);
    expect(choices.some((choice) => choice.id === "same-as-previous")).toBe(true);
    expect(choices.findIndex((choice) => choice.id === "default")).toBeLessThan(
      choices.findIndex((choice) => choice.id === "same-as-previous"),
    );
    expect(choices.every((choice) => choice.terminal)).toBe(true);
  });

  it("invalidates the workspace terminal choice cache", () => {
    invalidateTerminalCatalogCache();
    const first = discoverWorkspaceTerminalChoices();
    invalidateTerminalCatalogCache();
    const second = discoverWorkspaceTerminalChoices();
    expect(second).not.toBe(first);
    expect(first.some((choice) => choice.id === "default")).toBe(true);
    expect(second.some((choice) => choice.id === "default")).toBe(true);
    expect(second).not.toBe(first);
    expect(second.every((choice) => choice.terminal)).toBe(true);
  });

  it("includes a default profile sentinel for windows terminal settings", () => {
    const choices = discoverDefaultProfileChoices("wt");
    expect(choices[0]?.id).toBe("__default__");
    expect(choices.length).toBeGreaterThan(1);
  });

  it("includes conhost shell choices for console host settings", () => {
    const choices = discoverDefaultProfileChoices("conhost");
    expect(choices.some((choice) => choice.id === "__default__")).toBe(true);
    expect(choices.some((choice) => choice.id === "powershell" || choice.id === "pwsh" || choice.id === "cmd")).toBe(
      true,
    );
  });

  it("parses JSONC with inline comments", () => {
    const parsed = parseJsoncForTests(`{
      "profiles": {
        "list": [
          { "name": "PowerShell", "hidden": false }, // default
        ],
      },
    }`) as { profiles?: { list?: Array<{ name?: string }> } };

    expect(parsed.profiles?.list?.[0]?.name).toBe("PowerShell");
  });
});
