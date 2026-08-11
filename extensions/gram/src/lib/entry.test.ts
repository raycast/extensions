import { describe, it, expect } from "vitest";
import { getEntry } from "./entry";
import { Workspace } from "./workspaces";

describe("getEntry", () => {
  it("should format multi-folder titles with commas", () => {
    const mockWorkspace: Workspace = {
      id: 1,
      lastOpened: Date.now(),
      paths: ["/Users/me/project-a", "/Users/me/project-b"],
      type: "local",
      uri: "gram://...",
    };
    const entry = getEntry(mockWorkspace);
    expect(entry?.title).toBe("project-a, project-b");
  });

  it("should append [SSH] for remote projects", () => {
    const mockWorkspace: Workspace = {
      id: 2,
      lastOpened: Date.now(),
      paths: ["/home/root/app"],
      type: "remote",
      host: "my-server",
      uri: "gram://...",
    };
    const entry = getEntry(mockWorkspace);
    expect(entry?.subtitle).toContain("[SSH: my-server]");
  });

  it("should append [WSL] for WSL projects", () => {
    const mockWorkspace: Workspace = {
      id: 3,
      lastOpened: Date.now(),
      paths: ["/home/ubuntu/project"],
      type: "remote",
      wsl: {
        distro: "Ubuntu-22.04",
        user: "root",
      },
      uri: "gram://...",
    };
    const entry = getEntry(mockWorkspace);

    expect(entry?.subtitle).toContain("[WSL: Ubuntu-22.04]");
    expect(entry?.subtitle).not.toContain("SSH");
  });
});
