import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { botListIcon } from "./bot-icon";
import { avatarFilePath } from "./avatar-thumbnail";
import { parseAgentId } from "./types";

describe("botListIcon", () => {
  let supportPath = "";

  afterEach(() => {
    if (supportPath.length > 0) {
      rmSync(supportPath, { recursive: true, force: true });
      supportPath = "";
    }
  });

  it("returns a small SVG data URL when avatarHash is null", () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-icon-"));
    const id = parseAgentId("a1");
    if (!id.ok) {
      throw new Error("invalid test id");
    }
    const icon = botListIcon(
      {
        id: id.value,
        name: "Piper",
        title: "",
        description: "",
        isGroup: false,
        isHidden: false,
        status: { kind: "idle" },
        lastPreview: null,
        avatarColor: "#2563EB",
        avatarHash: null,
      },
      supportPath,
    );
    expect(typeof icon).toBe("string");
    if (typeof icon !== "string") {
      return;
    }
    expect(icon.startsWith("data:image/svg+xml")).toBe(true);
    expect(icon.length).toBeLessThan(800);
    expect(icon.includes("base64")).toBe(false);
  });

  it("returns a circular file icon when the thumbnail exists on disk", () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-icon-"));
    const id = parseAgentId("a1");
    if (!id.ok) {
      throw new Error("invalid test id");
    }
    const hash = "abcabcabcabcabca";
    const path = avatarFilePath({ supportPath, agentId: id.value, hash });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from("fake-jpeg"));

    const icon = botListIcon(
      {
        id: id.value,
        name: "Piper",
        title: "",
        description: "",
        isGroup: false,
        isHidden: false,
        status: { kind: "idle" },
        lastPreview: null,
        avatarColor: null,
        avatarHash: hash,
      },
      supportPath,
    );

    expect(icon).toEqual({ source: path, mask: "circle" });
    expect(existsSync(path)).toBe(true);
  });
});
