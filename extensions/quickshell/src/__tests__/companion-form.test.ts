import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COMPANION_CHOICE_TITLE_CUSTOM,
  COMPANION_CHOICE_TITLE_NONE,
  COMPANION_PRESET_CUSTOM,
  COMPANION_PRESET_NONE,
  getCompanionPresets,
  inferCompanionPresetFromPath,
  listCompanionFormChoices,
  normalizeCompanionPresetForForm,
  resolveCompanionPreset,
  resolveCompanionPresetAfterBrowse,
} from "../lib/companion-catalog";
import {
  buildWorkspaceFromFormState,
  createEmptyCompanionFormRow,
  workspaceFormStateFromWorkspace,
} from "../lib/workspace-form-state";
import type { Workspace } from "../lib/schema";

const originalPlatform = process.platform;

beforeEach(() => {
  // Windows companion catalog + basename inference (macOS CI is darwin).
  Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
});

afterEach(() => {
  Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
});

describe("companion-catalog", () => {
  it("lists presets with stable ids and default arguments", () => {
    const presets = getCompanionPresets();
    expect(presets.length).toBeGreaterThan(5);
    expect(presets.every((preset) => preset.id && preset.title && preset.candidatePaths.length > 0)).toBe(true);
    expect(resolveCompanionPreset("missing-preset")).toBeNull();
  });

  it("builds CmdPal-style form choices with none and custom sentinels", () => {
    const choices = listCompanionFormChoices();
    expect(choices[0]).toEqual({ id: COMPANION_PRESET_NONE, title: COMPANION_CHOICE_TITLE_NONE });
    expect(choices[choices.length - 1]).toEqual({
      id: COMPANION_PRESET_CUSTOM,
      title: COMPANION_CHOICE_TITLE_CUSTOM,
    });
    expect(choices.every((choice) => choice.id && choice.title)).toBe(true);
  });

  it("infers catalog presets from executable paths and falls back to custom", () => {
    expect(inferCompanionPresetFromPath("")).toBe(COMPANION_PRESET_NONE);
    expect(inferCompanionPresetFromPath("C:\\Apps\\MyTool.exe")).toBe(COMPANION_PRESET_CUSTOM);
    expect(inferCompanionPresetFromPath("C:\\Apps\\Code.exe")).toBe("vscode");
    expect(resolveCompanionPresetAfterBrowse("C:\\Apps\\MyTool.exe")).toBe(COMPANION_PRESET_CUSTOM);
    expect(resolveCompanionPresetAfterBrowse("C:\\Apps\\Code.exe")).toBe("vscode");
    expect(normalizeCompanionPresetForForm("not-a-real-preset", "")).toBe(COMPANION_PRESET_NONE);
    expect(normalizeCompanionPresetForForm("not-a-real-preset", "C:\\Apps\\Tool.exe")).toBe(COMPANION_PRESET_CUSTOM);
  });
});

describe("multi companion form state", () => {
  it("round-trips multiple companions through form state with inferred presets", () => {
    const workspace: Workspace = {
      id: "ws-1",
      name: "Demo",
      directory: "C:\\Projects\\demo",
      terminal: "wt",
      command: "npm run dev",
      runAsAdmin: false,
      isPinned: false,
      launches: [
        {
          id: "l1",
          label: "Dev",
          terminal: "wt",
          command: "npm run dev",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
        },
      ],
      companionApps: [
        {
          id: "c1",
          path: "C:\\Apps\\Code.exe",
          arguments: ".",
          openOnLaunch: true,
          order: 0,
        },
        {
          id: "c2",
          path: "C:\\Apps\\Fork.exe",
          arguments: "{folder}",
          openOnLaunch: false,
          order: 1,
        },
      ],
    };

    const state = workspaceFormStateFromWorkspace(workspace);
    expect(state.companions).toHaveLength(2);
    // Basename inference is OS-agnostic; installed-preset mapping needs the app on disk.
    expect(inferCompanionPresetFromPath("C:\\Apps\\Code.exe")).toBe("vscode");
    expect(state.companions[0].presetId).toBe(resolveCompanionPreset("vscode") ? "vscode" : "custom");
    expect(state.companions[0].path).toBe("C:\\Apps\\Code.exe");
    expect(state.companions[1].path).toBe("C:\\Apps\\Fork.exe");
    expect(createEmptyCompanionFormRow().presetId).toBe(COMPANION_PRESET_NONE);

    const saved = buildWorkspaceFromFormState(workspace, {
      ...state,
      companions: [
        ...state.companions,
        {
          id: "c3",
          presetId: COMPANION_PRESET_CUSTOM,
          path: "C:\\Apps\\Cursor.exe",
          arguments: ".",
          openOnLaunch: true,
        },
      ],
    });

    expect(saved.companionApps).toHaveLength(3);
    expect(saved.companionAppPath).toBe("C:\\Apps\\Code.exe");
    expect(saved.openCompanionAppOnLaunch).toBe(true);
  });

  it("drops none companion rows when saving", () => {
    const workspace: Workspace = {
      id: "ws-2",
      name: "Empty companions",
      directory: "C:\\Projects\\empty",
      terminal: "wt",
      runAsAdmin: false,
      isPinned: false,
      launches: [],
    };

    const saved = buildWorkspaceFromFormState(workspace, {
      ...workspaceFormStateFromWorkspace(workspace),
      companions: [createEmptyCompanionFormRow()],
    });

    expect(saved.companionApps ?? []).toHaveLength(0);
    expect(saved.companionAppPath).toBeNull();
  });
});
