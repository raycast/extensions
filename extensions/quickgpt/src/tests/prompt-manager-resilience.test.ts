import fs from "fs";
import os from "os";
import path from "path";
import configurationManager from "../managers/configuration-manager";
import promptManager from "../managers/prompt-manager";

describe("PromptManager refresh resilience", () => {
  it("uses readable prompts on a partial cold scan and preserves them on later failures", async () => {
    const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "quickgpt-prompts-"));
    const readableDirectory = path.join(rootDirectory, "readable");
    const unreadableDirectory = path.join(rootDirectory, "unreadable");
    fs.mkdirSync(readableDirectory);
    fs.mkdirSync(unreadableDirectory);
    fs.writeFileSync(
      path.join(readableDirectory, "prompts.hjson"),
      '[{ title: "Readable prompt", content: "still available" }]',
    );

    const directoriesSpy = jest.spyOn(configurationManager, "getDirectories");
    const originalReaddir = fs.promises.readdir.bind(fs.promises);
    const readdirSpy = jest.spyOn(fs.promises, "readdir").mockImplementation((targetPath, options) => {
      if (targetPath === unreadableDirectory) {
        return Promise.reject(Object.assign(new Error("permission denied"), { code: "EACCES" }));
      }
      return originalReaddir(targetPath, options as never) as unknown as ReturnType<typeof fs.promises.readdir>;
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const changeEvents: boolean[] = [];
    const unsubscribe = promptManager.subscribe((promptsChanged) => changeEvents.push(promptsChanged));

    try {
      directoriesSpy.mockReturnValue([unreadableDirectory, readableDirectory]);
      await expect(promptManager.reloadPrompts()).resolves.toBeUndefined();
      expect(promptManager.findPrompt((prompt) => prompt.title === "Readable prompt")).toBeDefined();

      directoriesSpy.mockReturnValue([unreadableDirectory]);
      await expect(promptManager.reloadPrompts()).rejects.toThrow("unreadable path");
      expect(promptManager.findPrompt((prompt) => prompt.title === "Readable prompt")).toBeDefined();
      expect(changeEvents).toEqual([true, false]);
    } finally {
      unsubscribe();
      directoriesSpy.mockRestore();
      readdirSpy.mockRestore();
      warnSpy.mockRestore();
      fs.rmSync(rootDirectory, { recursive: true, force: true });
    }
  });
});
