import { describe, expect, it } from "vitest";
import { captureBrowserUrl, resolveCaptureWorkspace } from "./capture.js";

function createMemoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("resolveCaptureWorkspace", () => {
  it("uses the saved workspace without asking again", async () => {
    const store = createMemoryStore({
      "learn.capture.workspace": "browser-agents",
    });
    let prompted = false;

    const workspace = await resolveCaptureWorkspace({
      listWorkspaces: async () => ["browser-agents", "papers"],
      chooseWorkspace: async () => {
        prompted = true;
        return "papers";
      },
      store,
    });

    expect(workspace).toBe("browser-agents");
    expect(prompted).toBe(false);
  });

  it("prompts once and remembers the selected workspace", async () => {
    const store = createMemoryStore();
    let promptCount = 0;
    const dependencies = {
      listWorkspaces: async () => ["browser-agents", "papers"],
      chooseWorkspace: async (workspaces: string[]) => {
        promptCount++;
        expect(workspaces).toEqual(["browser-agents", "papers"]);
        return "papers";
      },
      store,
    };

    await expect(resolveCaptureWorkspace(dependencies)).resolves.toBe("papers");
    await expect(resolveCaptureWorkspace(dependencies)).resolves.toBe("papers");
    expect(promptCount).toBe(1);
  });

  it("fails with a useful message when there are no workspaces", async () => {
    await expect(
      resolveCaptureWorkspace({
        listWorkspaces: async () => [],
        chooseWorkspace: async () => "never",
        store: createMemoryStore(),
      }),
    ).rejects.toThrow("No Learn workspace found");
  });
});

describe("captureBrowserUrl", () => {
  it("adds the URL to the selected workspace and leaves it pending", async () => {
    const calls: string[][] = [];
    const result = await captureBrowserUrl({
      url: "https://example.com/article",
      title: "Article title",
      workspace: "browser-agents",
      runLearn: async (args) => {
        calls.push(args);
        return { stdout: "✓ Resource added to workspace", stderr: "", code: 0 };
      },
    });

    expect(calls).toEqual([
      [
        "add",
        "https://example.com/article",
        "--workspace",
        "browser-agents",
        "--title",
        "Article title",
      ],
    ]);
    expect(result).toEqual({ status: "saved", title: "Article title" });
  });

  it("reports duplicate URLs without treating them as a capture failure", async () => {
    const result = await captureBrowserUrl({
      url: "https://example.com/article",
      workspace: "browser-agents",
      runLearn: async () => ({
        stdout: "",
        stderr: 'Error: Resource "https://example.com/article" already exists',
        code: 1,
      }),
    });

    expect(result).toEqual({ status: "duplicate" });
  });
});
