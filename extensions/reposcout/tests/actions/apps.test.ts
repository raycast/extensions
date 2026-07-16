import { describe, expect, it } from "vitest";
import { editorLabel, otherEditor } from "../../src/actions/apps";

describe("editor app mappings", () => {
  it("provides short labels", () => {
    expect(editorLabel("vscode")).toBe("VS Code");
    expect(editorLabel("cursor")).toBe("Cursor");
  });

  it("returns the opposite editor", () => {
    expect(otherEditor("vscode")).toBe("cursor");
    expect(otherEditor("cursor")).toBe("vscode");
  });
});
