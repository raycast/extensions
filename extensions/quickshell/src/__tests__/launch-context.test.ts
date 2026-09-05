import { describe, expect, it } from "vitest";
import { resolveOpenWorkspaceInitialMode, resolveOpenWorkspaceSearchSeed } from "../lib/launch-context";

describe("launch-context", () => {
  it("prefers fallback text over launch context", () => {
    expect(
      resolveOpenWorkspaceSearchSeed("api", {
        focusWorkspaceName: "Frontend",
      }),
    ).toBe("api");
  });

  it("uses launch context when fallback text is empty", () => {
    expect(
      resolveOpenWorkspaceSearchSeed(undefined, {
        focusWorkspaceName: "QuickShell",
      }),
    ).toBe("QuickShell");
  });

  it("resolves initial hub modes from launch context", () => {
    expect(resolveOpenWorkspaceInitialMode(undefined)).toBe("list");
    expect(resolveOpenWorkspaceInitialMode({ mode: "discover" })).toBe("discover");
    expect(resolveOpenWorkspaceInitialMode({ createDirectory: "D:\\Dev\\App" })).toBe("create");
    expect(resolveOpenWorkspaceInitialMode({ mode: "create" })).toBe("create");
    expect(resolveOpenWorkspaceInitialMode({ editWorkspaceId: "abc" })).toBe("edit");
    expect(resolveOpenWorkspaceInitialMode({ mode: "edit", editWorkspaceId: "abc" })).toBe("edit");
  });
});
