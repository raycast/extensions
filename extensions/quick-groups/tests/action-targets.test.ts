import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { actionUrl, expandHomePath } from "../src/action-targets";

describe("actionUrl", () => {
  it("expands portable home-directory targets", () => {
    expect(expandHomePath("~")).toBe(os.homedir());
    expect(expandHomePath("~/Projects/reference")).toBe(
      path.join(os.homedir(), "Projects/reference"),
    );
    expect(actionUrl({ kind: "open", target: "~/." })).toBe(os.homedir());
  });

  it("does not alter URLs or embedded tildes", () => {
    expect(expandHomePath("https://example.com/~user")).toBe("https://example.com/~user");
  });

  it("uses the first path segment as the vault and the remainder as the file", () => {
    expect(actionUrl({ kind: "obsidian", target: "NEB/Machines/Beelink EQR5 Mini PC" })).toBe(
      "obsidian://open?vault=NEB&file=Machines%2FBeelink%20EQR5%20Mini%20PC",
    );
  });

  it("treats an Obsidian target without a slash as a file", () => {
    expect(actionUrl({ kind: "obsidian", target: "Inbox" })).toBe("obsidian://open?file=Inbox");
  });

  it("preserves an explicit Obsidian URI", () => {
    const uri = "obsidian://open?vault=NEB&file=Machines%2FServer";
    expect(actionUrl({ kind: "obsidian", target: uri })).toBe(uri);
  });
});
