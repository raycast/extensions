import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authorize,
  authorizePostLaunchEffects,
  coerceTrustedWhileDisabled,
  createReviewToken,
  matchesReviewToken,
  setWorkspaceTrustEnabledForTests,
  WORKSPACE_TRUST_DEFAULT_ENABLED,
} from "../lib/security";
import type { StoredWorkspace, Workspace } from "../lib/schema";

const tempDirs: string[] = [];

beforeEach(() => {
  setWorkspaceTrustEnabledForTests(true);
});

afterEach(() => {
  setWorkspaceTrustEnabledForTests(null);
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (!directory) {
      continue;
    }
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup.
    }
  }
});

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "quickshell-security-"));
  tempDirs.push(directory);
  return directory;
}

const workspace: Workspace = {
  id: "workspace-1",
  name: "Workspace",
  directory: "C:\\Projects\\Workspace",
  terminal: "wt",
  command: "powershell -NoProfile",
  runAsAdmin: true,
  launches: [
    {
      id: "launch-1",
      label: "Launch",
      terminal: "wt",
      command: "echo hello",
      runAsAdmin: true,
      isEnabled: true,
      order: 0,
    },
  ],
  isPinned: false,
};

function stored(isTrusted: boolean): StoredWorkspace {
  return { content: workspace, security: { isTrusted, revision: 3 }, revision: 3 };
}

describe("workspace security policy", () => {
  it("blocks untrusted launch and directory actions while allowing copy path", () => {
    expect(authorize(stored(false), { kind: "terminal" }).isAllowed).toBe(false);
    expect(authorize(stored(false), { kind: "directory" }).isAllowed).toBe(false);
    expect(authorize(stored(false), { kind: "copyPath" }).isAllowed).toBe(true);
  });

  it("returns risk findings for command and elevation content", () => {
    const result = authorize(stored(true), { kind: "grantTrust" });
    expect(result.risks.map((risk) => risk.code)).toEqual(expect.arrayContaining(["command", "elevation"]));
  });

  it("binds review to the authoritative revision and content digest", () => {
    const review = createReviewToken(stored(false));
    expect(matchesReviewToken(stored(false), review)).toBe(true);
    expect(matchesReviewToken({ ...stored(false), revision: 4 }, review)).toBe(false);
  });

  it("digests launch toggles and legacy companions while ignoring usage metadata", () => {
    const base = stored(false);
    const review = createReviewToken(base);

    expect(matchesReviewToken({ ...base, content: { ...base.content, openDevServerOnLaunch: true } }, review)).toBe(
      false,
    );
    expect(
      matchesReviewToken(
        {
          ...base,
          content: {
            ...base.content,
            companionAppPath: process.execPath,
            companionAppArguments: "--reuse-window",
            openCompanionAppOnLaunch: true,
          },
        },
        review,
      ),
    ).toBe(false);
    expect(
      matchesReviewToken(
        { ...base, content: { ...base.content, isPinned: true, pinOrder: 2, lastUsedUtc: new Date().toISOString() } },
        review,
      ),
    ).toBe(true);
  });

  it("rejects unsafe URL schemes and control characters", () => {
    const malformed = { ...workspace, repoUrl: "javascript:alert(1)" };
    const result = authorize({ ...stored(true), content: malformed }, { kind: "url", url: malformed.repoUrl });
    expect(result.isAllowed).toBe(false);
    expect(result.primaryIssueCode).toBe("InvalidUrl");
  });

  it.each(["javascript:alert(1)", "file:///c:/windows/system32/notepad.exe", "vbscript:msgbox(1)"])(
    "rejects unsafe URL scheme %s",
    (url) => {
      const result = authorize(stored(true), { kind: "url", url });
      expect(result.isAllowed).toBe(false);
      expect(result.primaryIssueCode).toBe("InvalidUrl");
    },
  );

  it.each(["echo one\necho two", "echo one\recho two", "echo one\0echo two"])(
    "rejects control characters in commands",
    (command) => {
      const directory = createTempDirectory();
      const content = {
        ...workspace,
        directory,
        command,
        launches: [{ ...workspace.launches[0], command }],
      };
      const value = { ...stored(true), content };
      expect(authorize(value, { kind: "terminal" }).primaryIssueCode).toBe("InvalidCommand");
      expect(authorize(value, { kind: "grantTrust" }).primaryIssueCode).toBe("InvalidCommand");
    },
  );

  it.each(["\\\\?\\pipe\\quickshell", "\\\\localhost\\share\\project", "%TEMP%\\project"])(
    "rejects UNC, pipe, and env open-directory paths (%s)",
    (directory) => {
      const value = { ...stored(true), content: { ...workspace, directory } };
      const open = authorize(value, { kind: "directory" });
      expect(open.isAllowed).toBe(false);
      expect(["InvalidDirectory", "DirectoryOpenNotAllowed"]).toContain(open.primaryIssueCode);
    },
  );

  it("rejects companion newline injection for companion and grantTrust", () => {
    const directory = createTempDirectory();
    const content: Workspace = {
      ...workspace,
      directory,
      companionApps: [
        {
          id: "companion-1",
          path: `${process.execPath}\nbad`,
          arguments: "--folder\n--evil",
          openOnLaunch: true,
          order: 0,
        },
      ],
    };
    const value = { ...stored(true), content };
    expect(authorize(value, { kind: "companion", companionId: "companion-1" }).primaryIssueCode).toBe(
      "InvalidCompanion",
    );
    expect(authorize(value, { kind: "grantTrust" }).primaryIssueCode).toBe("InvalidCompanion");
  });

  it("allows a valid terminal launch when optional effects are invalid", () => {
    const content: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      devServerUrl: "javascript:alert(1)",
      openDevServerOnLaunch: true,
      companionApps: [
        {
          id: "bad",
          path: "bad\r\npath",
          arguments: null,
          openOnLaunch: true,
          order: 0,
        },
      ],
    };

    const result = authorize({ ...stored(true), content }, { kind: "terminal" });

    expect(result.isAllowed).toBe(true);
    expect(result.effectiveValues.directory).toBe("\\\\wsl$\\Ubuntu\\home\\dev\\project");
  });

  it("authorizes a selected repository launch without validating stale workspace fields or siblings", () => {
    const content: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      command: "bad\r\nworkspace command",
      launches: [
        {
          ...workspace.launches[0],
          id: "selected",
          command: "npm test",
          isEnabled: true,
        },
        {
          ...workspace.launches[0],
          id: "invalid-sibling",
          label: "",
          command: "bad\r\nsibling command",
          isEnabled: false,
        },
      ],
    };

    const result = authorize({ ...stored(true), content }, { kind: "launchEntry", launchId: "selected" });

    expect(result.isAllowed).toBe(true);
    expect(result.effectiveValues.command).toBe("npm test");
    expect(authorize({ ...stored(true), content }, { kind: "terminal" }).isAllowed).toBe(false);
  });

  it("denies a selected launch that is disabled in authoritative storage", () => {
    const content: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      launches: [{ ...workspace.launches[0], id: "disabled", isEnabled: false }],
    };

    const result = authorize({ ...stored(true), content }, { kind: "launchEntry", launchId: "disabled" });

    expect(result.isAllowed).toBe(false);
    expect(result.primaryIssueCode).toBe("InvalidLaunch");
  });

  it("allows WSL launch paths but denies opening them as folders", () => {
    const content = { ...workspace, directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project" };
    const value = { ...stored(true), content };

    expect(authorize(value, { kind: "terminal" }).isAllowed).toBe(true);
    expect(authorize(value, { kind: "directory" }).isAllowed).toBe(false);
  });

  it("resolves each open-on-launch companion by ID and suppresses invalid effects", () => {
    const content: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      devServerUrl: "https://localhost:5173/?next=a&mode=b",
      openDevServerOnLaunch: true,
      companionApps: [
        {
          id: "missing",
          path: "Z:\\missing\\app.exe",
          arguments: "--bad",
          openOnLaunch: true,
          order: 0,
        },
        {
          id: "node",
          path: process.execPath,
          arguments: "--project {folder}",
          openOnLaunch: true,
          order: 1,
        },
      ],
    };

    const effects = authorizePostLaunchEffects({ ...stored(true), content });

    expect(effects.plan.companions).toHaveLength(1);
    expect(effects.plan.companions[0]).toMatchObject({
      companionId: "node",
      executablePath: process.execPath,
      arguments: "--project {folder}",
    });
    expect(effects.plan.devServerUrl).toBe("https://localhost:5173/?next=a&mode=b");
    expect(effects.warnings).toHaveLength(1);
  });

  it("fails closed for ambiguous duplicate companion IDs", () => {
    const duplicate = {
      id: "duplicate",
      path: process.execPath,
      arguments: null,
      openOnLaunch: true,
      order: 0,
    };
    const content: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      companionApps: [duplicate, { ...duplicate, arguments: "--second", order: 1 }],
    };
    const value = { ...stored(true), content };

    const authorization = authorize(value, { kind: "companion", companionId: "duplicate" });
    const effects = authorizePostLaunchEffects(value);

    expect(authorization.isAllowed).toBe(false);
    expect(authorization.primaryIssueCode).toBe("InvalidCompanion");
    expect(effects.plan.companions).toEqual([]);
    expect(effects.warnings).toHaveLength(2);
  });
});

describe("workspace trust kill switch (disabled)", () => {
  beforeEach(() => {
    setWorkspaceTrustEnabledForTests(false);
  });

  it("allows trust-gated actions for untrusted workspaces", () => {
    const directory = createTempDirectory();
    const value: StoredWorkspace = {
      content: { ...workspace, directory, devServerUrl: "https://example.com" },
      security: { isTrusted: false, revision: 3 },
      revision: 3,
    };
    expect(authorize(value, { kind: "terminal" }).isAllowed).toBe(true);
    expect(authorize(value, { kind: "launchEntry", launchId: "launch-1" }).isAllowed).toBe(true);
    expect(authorize(value, { kind: "url", url: "https://example.com" }).isAllowed).toBe(true);

    // Open-directory still requires an existing rooted Windows drive path (product is
    // Windows-only). On Linux CI assert trust is not the blocker; on Windows assert allow.
    const openDirectory = authorize(value, { kind: "directory" });
    expect(openDirectory.issues.some((issue) => issue.code === "WorkspaceUntrusted")).toBe(false);
    if (process.platform === "win32") {
      expect(openDirectory.isAllowed).toBe(true);
    } else {
      expect(openDirectory.isAllowed).toBe(false);
      expect(openDirectory.primaryIssueCode).toBe("DirectoryOpenNotAllowed");
    }
  });

  it("matches the shared JSON default", () => {
    const shared = JSON.parse(
      readFileSync(resolve(__dirname, "../../../shared/workspace-trust-features.json"), "utf8"),
    ) as { enabled: boolean };
    const local = JSON.parse(readFileSync(resolve(__dirname, "../lib/workspace-trust-features.json"), "utf8")) as {
      enabled: boolean;
    };
    expect(local.enabled).toBe(shared.enabled);
    expect(WORKSPACE_TRUST_DEFAULT_ENABLED).toBe(shared.enabled);
  });

  it("coerceTrustedWhileDisabled rewrites untrusted rows", () => {
    const { security, changed } = coerceTrustedWhileDisabled(
      { a: { isTrusted: false, revision: 4 }, b: { isTrusted: true, revision: 1 } },
      ["a", "b", "c"],
    );
    expect(changed).toBe(true);
    expect(security.a).toEqual({ isTrusted: true, revision: 4 });
    expect(security.b).toEqual({ isTrusted: true, revision: 1 });
  });
});
