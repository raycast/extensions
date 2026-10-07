import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAttachments } from "@commands/search-attachments/lib/attachments";
import { createTempDir, removeDir, writeTextFile } from "../../../helpers/fs";

let tempDir: string | undefined;

afterEach(async () => {
  vi.restoreAllMocks();

  if (tempDir) {
    await removeDir(tempDir);
    tempDir = undefined;
  }
});

describe("attachments", () => {
  it("scans supported attachment directories and filters excluded files", async () => {
    tempDir = await createTempDir("octarine-attachments");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, ".attachments", "docs", "report.pdf"), "report");
    await writeTextFile(path.join(workspace.path, ".attachments", "images", "logo.png"), "png");
    await writeTextFile(path.join(workspace.path, ".files", "notes", "readme.md"), "readme");
    await writeTextFile(path.join(workspace.path, ".files", "~$draft.docx"), "temp");
    await writeTextFile(path.join(workspace.path, ".files", ".DS_Store"), "system");
    await writeTextFile(path.join(workspace.path, ".files", "Archive", "ignored.txt"), "ignored");

    const result = await getAttachments([workspace], new Set(["png"]), new Set(["archive"]), { refresh: true });

    expect(result.map((attachment) => attachment.name)).toEqual(["readme.md", "report.pdf"]);
    expect(result.map((attachment) => attachment.searchText)).toEqual(["readme.md work md", "report.pdf work pdf"]);
  });

  it("returns cached attachments on a warm cache", async () => {
    tempDir = await createTempDir("octarine-attachments-cache");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, ".attachments", "Inbox.pdf"), "initial");

    const initial = await getAttachments([workspace], new Set(), new Set());

    await writeTextFile(path.join(workspace.path, ".attachments", "Archive.pdf"), "new");

    const cached = await getAttachments([workspace], new Set(), new Set());

    expect(initial.map((attachment) => attachment.name)).toEqual(["Inbox.pdf"]);
    expect(cached.map((attachment) => attachment.name)).toEqual(["Inbox.pdf"]);
  });

  it("bypasses the cache on refresh and stores refreshed attachments", async () => {
    tempDir = await createTempDir("octarine-attachments-refresh");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, ".attachments", "Inbox.pdf"), "initial");

    const initial = await getAttachments([workspace], new Set(), new Set());

    await writeTextFile(path.join(workspace.path, ".attachments", "Archive.pdf"), "new");

    const refreshed = await getAttachments([workspace], new Set(), new Set(), { refresh: true });
    const cachedAfterRefresh = await getAttachments([workspace], new Set(), new Set());

    expect(initial.map((attachment) => attachment.name)).toEqual(["Inbox.pdf"]);
    expect(refreshed.map((attachment) => attachment.name)).toEqual(["Archive.pdf", "Inbox.pdf"]);
    expect(cachedAfterRefresh.map((attachment) => attachment.name)).toEqual(["Archive.pdf", "Inbox.pdf"]);
  });

  it("keeps caches for different excluded extensions and directories separate", async () => {
    tempDir = await createTempDir("octarine-attachments-exclusions");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, ".attachments", "report.pdf"), "pdf");
    await writeTextFile(path.join(workspace.path, ".attachments", "logo.png"), "png");
    await writeTextFile(path.join(workspace.path, ".attachments", "archive", "secret.txt"), "secret");

    const withoutPng = await getAttachments([workspace], new Set(["png"]), new Set());
    const withPng = await getAttachments([workspace], new Set(), new Set());
    const withoutArchive = await getAttachments([workspace], new Set(), new Set(["archive"]));

    expect(withoutPng.map((attachment) => attachment.name)).toEqual(["report.pdf", "secret.txt"]);
    expect(withPng.map((attachment) => attachment.name)).toEqual(["logo.png", "report.pdf", "secret.txt"]);
    expect(withoutArchive.map((attachment) => attachment.name)).toEqual(["logo.png", "report.pdf"]);
  });

  it("keeps caches for different workspace sets separate", async () => {
    tempDir = await createTempDir("octarine-attachments-workspaces");

    const alpha = {
      name: "Alpha",
      path: path.join(tempDir, "Alpha"),
    };
    const beta = {
      name: "Beta",
      path: path.join(tempDir, "Beta"),
    };

    await writeTextFile(path.join(alpha.path, ".attachments", "alpha.pdf"), "alpha");
    await writeTextFile(path.join(beta.path, ".attachments", "beta.pdf"), "beta");

    const alphaOnly = await getAttachments([alpha], new Set(), new Set());
    const both = await getAttachments([alpha, beta], new Set(), new Set());

    expect(alphaOnly.map((attachment) => attachment.name)).toEqual(["alpha.pdf"]);
    expect(both.map((attachment) => attachment.name)).toEqual(["alpha.pdf", "beta.pdf"]);
  });
});
