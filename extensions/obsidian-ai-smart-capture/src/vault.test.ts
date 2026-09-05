import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildVaultProfile, containsLikelySecret, createNote, validateNotePath } from "./vault";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

async function createVault() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "smart-capture-"));
  temporaryDirectories.push(root);
  await fs.mkdir(path.join(root, "00 Inbox"), { recursive: true });
  await fs.mkdir(path.join(root, "20 Work", "TAP"), { recursive: true });
  await fs.mkdir(path.join(root, "90 Archive"), { recursive: true });
  await fs.writeFile(path.join(root, "00 Inbox", "Needs Review.md"), "Unsorted thought");
  await fs.writeFile(path.join(root, "20 Work", "TAP", "TAP Index.md"), "# TAP\n\nChat and agents");
  await fs.writeFile(path.join(root, "20 Work", "TAP", "Chat.md"), "Message persistence and mentions");
  await fs.writeFile(path.join(root, "90 Archive", "Old.md"), "Old work");
  return root;
}

describe("buildVaultProfile", () => {
  it("uses active content folders and excludes archives", async () => {
    const root = await createVault();
    const profile = await buildVaultProfile(root);

    expect(profile.candidateFolders).toContain("00 Inbox");
    expect(profile.candidateFolders[0]).toBe(".");
    expect(profile.candidateFolders).toContain(path.join("20 Work", "TAP"));
    expect(profile.candidateFolders).not.toContain("90 Archive");
    expect(profile.context).toContain("Message persistence and mentions");
  });

  it("excludes likely secrets from provider context", () => {
    expect(containsLikelySecret("Pi.md", "api_key = sk-or-secretvalue123456")).toBe(true);
    expect(containsLikelySecret("AWS Creds.md", "ordinary text")).toBe(true);
    expect(containsLikelySecret("Account.md", "UnlabeledPassword123\nAnotherCredential456")).toBe(true);
  });
});

describe("createNote", () => {
  it("never overwrites an existing note", async () => {
    const root = await createVault();
    const classification = { title: "Chat", folder: path.join("20 Work", "TAP"), confidence: 1 };
    const created = await createNote(root, classification, "New content");

    expect(created.relativePath).toBe(path.join("20 Work", "TAP", "Chat 2.md"));
    expect(await fs.readFile(created.absolutePath, "utf8")).toBe("New content\n");
  });

  it("creates a note in the vault root when it is selected as the fallback", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "smart-capture-"));
    temporaryDirectories.push(root);

    const created = await createNote(root, { title: "Needs Review", folder: ".", confidence: 0.2 }, "Content");

    expect(created.relativePath).toBe("Needs Review.md");
    expect(await fs.readFile(created.absolutePath, "utf8")).toBe("Content\n");
  });
});

describe("validateNotePath", () => {
  it("accepts a Markdown note inside the vault", async () => {
    const root = await createVault();
    const note = path.join(root, "00 Inbox", "Needs Review.md");

    expect(validateNotePath(root, note)).toBe(note);
  });

  it("refuses to delete a file outside the vault", async () => {
    const root = await createVault();
    const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "smart-capture-outside-"));
    temporaryDirectories.push(outsideDirectory);
    const note = path.join(outsideDirectory, "Keep Me.md");
    await fs.writeFile(note, "Do not delete");

    expect(() => validateNotePath(root, note)).toThrow("not a Markdown file inside this vault");
    expect(await fs.readFile(note, "utf8")).toBe("Do not delete");
  });
});
