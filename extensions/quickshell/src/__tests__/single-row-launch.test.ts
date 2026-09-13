import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { authorizePostLaunchEffects } from "../lib/security";
import type { StoredWorkspace, Workspace } from "../lib/schema";

describe("single-row launch skips companion and dev-server", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("suppresses companion and dev-server when include flags are false", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "qs-single-row-"));
    dirs.push(directory);
    const content: Workspace = {
      id: "ws",
      name: "Demo",
      directory,
      terminal: "wt",
      command: "npm test",
      runAsAdmin: false,
      isPinned: false,
      launches: [
        {
          id: "selected",
          label: "Test",
          terminal: "wt",
          command: "npm test",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
        },
      ],
      openDevServerOnLaunch: true,
      devServerUrl: "http://localhost:5173",
      companionApps: [
        {
          id: "node",
          path: process.execPath,
          arguments: null,
          openOnLaunch: true,
          order: 0,
        },
      ],
    };
    const stored: StoredWorkspace = {
      content,
      security: { isTrusted: true, revision: 1 },
      revision: 1,
    };

    const skipped = authorizePostLaunchEffects(stored, {
      includeCompanion: false,
      includeDevServer: false,
    });
    expect(skipped.plan.companions).toEqual([]);
    expect(skipped.plan.devServerUrl).toBeNull();

    const full = authorizePostLaunchEffects(stored, {
      includeCompanion: true,
      includeDevServer: true,
    });
    expect(full.plan.companions).toHaveLength(1);
    expect(full.plan.devServerUrl).toBe("http://localhost:5173");
  });
});
