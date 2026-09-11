import { existsSync, readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

const extensionRoot = process.cwd();

describe("Raycast Store readiness", () => {
  it("provides English setup documentation and a changelog", () => {
    const readme = readFileSync(`${extensionRoot}/README.md`, "utf8");
    const changelogPath = `${extensionRoot}/CHANGELOG.md`;

    expect(readme).not.toMatch(/[\u3400-\u9fff]/u);
    expect(readme).toContain("https://www.screenlex.cc");
    expect(readme).toContain("Screen Recording");
    expect(existsSync(changelogPath)).toBe(true);
    expect(readFileSync(changelogPath, "utf8")).toContain("{PR_MERGE_DATE}");
  });

  it("includes at least three PNG Store screenshots", () => {
    const metadataPath = `${extensionRoot}/metadata`;
    const screenshots = existsSync(metadataPath)
      ? readdirSync(metadataPath).filter((file) => file.endsWith(".png"))
      : [];

    expect(screenshots.length).toBeGreaterThanOrEqual(3);
  });
});
