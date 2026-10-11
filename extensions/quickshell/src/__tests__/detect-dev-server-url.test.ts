import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectDevServerUrl } from "../lib/detect-dev-server-url";

describe("detectDevServerUrl", () => {
  it("returns null when package.json is missing", () => {
    const directory = mkdtempSync(join(tmpdir(), "qs-devserver-"));
    expect(detectDevServerUrl(directory)).toBeNull();
  });

  it("detects an explicit port from the dev script", () => {
    const directory = mkdtempSync(join(tmpdir(), "qs-devserver-"));
    writeFileSync(join(directory, "package.json"), JSON.stringify({ scripts: { dev: "vite --port 4173" } }), "utf8");
    expect(detectDevServerUrl(directory)).toBe("http://localhost:4173");
  });

  it("infers vite default port from dependencies", () => {
    const directory = mkdtempSync(join(tmpdir(), "qs-devserver-"));
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        scripts: { dev: "vite" },
        devDependencies: { vite: "^5.0.0" },
      }),
      "utf8",
    );
    expect(detectDevServerUrl(directory)).toBe("http://localhost:5173");
  });
});
