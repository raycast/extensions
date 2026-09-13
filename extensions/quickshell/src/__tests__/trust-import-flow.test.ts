import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  exportStoredData,
  importParsedPayload,
  MAX_IMPORT_PAYLOAD_BYTES,
  parseImportPayload,
} from "../lib/import-export";
import { createEmptyStoredData, type StoredWorkspace, type Workspace } from "../lib/schema";
import { authorize, createReviewToken, matchesReviewToken, setWorkspaceTrustEnabledForTests } from "../lib/security";

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
      // Best-effort cleanup for temp workspace folders.
    }
  }
});

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "quickshell-raycast-trust-"));
  tempDirs.push(directory);
  return directory;
}

function workspaceFor(directory: string): Workspace {
  return {
    id: "trust-flow",
    name: "TrustFlow",
    directory,
    terminal: "wt",
    command: "echo one",
    runAsAdmin: false,
    isPinned: false,
    launches: [
      {
        id: "launch-1",
        label: "Launch",
        terminal: "wt",
        command: "echo one",
        runAsAdmin: false,
        isEnabled: true,
        order: 0,
      },
    ],
  };
}

function stored(content: Workspace, isTrusted: boolean, revision = 1): StoredWorkspace {
  return {
    content,
    security: { isTrusted, revision },
    revision,
  };
}

describe("trust launch flow", () => {
  it("blocks launch until grant, then blocks again after revoke", () => {
    const directory = createTempDirectory();
    const content = workspaceFor(directory);
    let current = stored(content, false, 1);

    expect(authorize(current, { kind: "terminal" }).isAllowed).toBe(false);
    expect(authorize(current, { kind: "terminal" }).primaryIssueCode).toBe("WorkspaceUntrusted");

    const token = createReviewToken(current);
    expect(matchesReviewToken(current, token)).toBe(true);
    expect(authorize(current, { kind: "grantTrust" }).isAllowed).toBe(true);

    current = {
      content,
      security: { isTrusted: true, revision: current.revision + 1 },
      revision: current.revision + 1,
    };
    expect(authorize(current, { kind: "terminal" }).isAllowed).toBe(true);

    current = {
      content,
      security: { isTrusted: false, revision: current.revision + 1 },
      revision: current.revision + 1,
    };
    expect(authorize(current, { kind: "terminal" }).isAllowed).toBe(false);
    expect(authorize(current, { kind: "terminal" }).primaryIssueCode).toBe("WorkspaceUntrusted");
  });

  it("rejects grant when the review token no longer matches", () => {
    const directory = createTempDirectory();
    const content = workspaceFor(directory);
    const current = stored(content, false, 2);
    const token = createReviewToken(current);
    const changed = { ...current, revision: 3, security: { isTrusted: false, revision: 3 } };

    expect(matchesReviewToken(changed, token)).toBe(false);
  });
});

describe("import trust flow", () => {
  it("exports without workspaceSecurity and imports as untrusted", () => {
    const directory = createTempDirectory();
    const content = workspaceFor(directory);
    const existing = createEmptyStoredData();
    existing.workspaces = [content];
    existing.workspaceSecurity = { [content.id]: { isTrusted: true, revision: 5 } };

    const exported = exportStoredData(existing);
    expect(exported).not.toContain("workspaceSecurity");
    expect(exported).not.toContain("isTrusted");

    const imported = parseImportPayload(exported);
    expect(imported.imported).toBe(1);
    const importedId = imported.data.workspaces[0].id;
    expect(imported.data.workspaceSecurity?.[importedId]).toEqual({ isTrusted: false, revision: 1 });
  });

  it("keeps existing workspace trust and marks colliding imports untrusted under a new id", () => {
    const directory = createTempDirectory();
    const existingContent = workspaceFor(directory);
    const existing = createEmptyStoredData();
    existing.workspaces = [existingContent];
    existing.workspaceSecurity = { [existingContent.id]: { isTrusted: true, revision: 4 } };

    const importedPayload = {
      version: 1,
      workspaces: [{ ...existingContent, name: "TrustFlow Clone" }],
      settings: existing.settings,
    };
    const result = importParsedPayload(importedPayload, existing);

    expect(result.imported).toBe(1);
    expect(result.data.workspaceSecurity?.[existingContent.id]).toEqual({ isTrusted: true, revision: 4 });
    const newWorkspace = result.data.workspaces.find((workspace) => workspace.id !== existingContent.id);
    expect(newWorkspace).toBeDefined();
    expect(result.data.workspaceSecurity?.[newWorkspace!.id]).toEqual({ isTrusted: false, revision: 1 });
  });

  it("rejects oversized and malformed import payloads", () => {
    const padding = "x".repeat(MAX_IMPORT_PAYLOAD_BYTES);
    expect(() => parseImportPayload(`[{"Name":"Huge","Directory":"C:\\\\Temp","Command":"${padding}"}]`)).toThrow(
      /too large/i,
    );
    expect(() => parseImportPayload("{ not-json")).toThrow(/not valid JSON/i);
  });
});
