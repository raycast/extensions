import fs from "fs";
import os from "os";
import path from "path";
import { createPromptLibrary, STARTER_LIBRARY_FILENAME } from "../utils/prompt-library-onboarding";

describe("createPromptLibrary", () => {
  let rootDirectory: string;
  let sourcePath: string;

  beforeEach(() => {
    rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "quickgpt-library-"));
    sourcePath = path.join(rootDirectory, "source.hjson");
    fs.writeFileSync(sourcePath, '{ title: "Starter" }\n');
  });

  afterEach(() => {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  });

  it("creates the directory and copies the starter template", async () => {
    const directory = path.join(rootDirectory, "QuickGPT Prompts");

    const result = await createPromptLibrary({ directory, sourcePath });

    expect(result.createdDirectory).toBe(true);
    expect(result.copiedFile).toBe(true);
    expect(result.filePath).toBe(path.join(directory, STARTER_LIBRARY_FILENAME));
    expect(fs.readFileSync(result.filePath, "utf-8")).toBe('{ title: "Starter" }\n');
  });

  it("leaves an existing library file untouched", async () => {
    const directory = path.join(rootDirectory, "QuickGPT Prompts");
    const existingFile = path.join(directory, STARTER_LIBRARY_FILENAME);
    fs.mkdirSync(directory);
    fs.writeFileSync(existingFile, '{ title: "Mine" }\n');

    const result = await createPromptLibrary({ directory, sourcePath });

    expect(result.createdDirectory).toBe(false);
    expect(result.copiedFile).toBe(false);
    expect(fs.readFileSync(existingFile, "utf-8")).toBe('{ title: "Mine" }\n');
  });

  it("throws when the starter template is missing", async () => {
    const directory = path.join(rootDirectory, "QuickGPT Prompts");

    await expect(
      createPromptLibrary({ directory, sourcePath: path.join(rootDirectory, "missing.hjson") }),
    ).rejects.toThrow("Starter prompt template is missing");
  });
});
