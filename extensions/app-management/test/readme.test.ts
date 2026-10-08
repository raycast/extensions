// Two READMEs: README.md is the Store copy (ray publish copies it; it never copies .github), and .github/README.md is
// what GitHub shows. They must stay identical apart from the GitHub-only Install section, demo video, header comment,
// and image paths, which are relative to .github/.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd(); // npm test runs from the repository root
const store = readFileSync(join(root, "README.md"), "utf8");
const github = readFileSync(join(root, ".github/README.md"), "utf8");

function withoutGithubOnlyParts(text: string): string {
  return text
    .replace(/^<!--[^\n]*-->\n+/, "")
    .replace(/^https:\/\/github\.com\/user-attachments\/assets\/[^\n]+\n\n/m, "")
    .replace(/## Install\n[\s\S]*?(?=## Set the hotkeys\n)/, "")
    .replaceAll("](../media/", "](media/");
}

describe("README copies", () => {
  it("the GitHub README is the Store README plus the Install section", () => {
    assert.equal(withoutGithubOnlyParts(github), store);
  });

  it("the GitHub README embeds the demo video (a GitHub-hosted upload, not a file in the repository)", () => {
    assert.match(github, /^https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+$/m);
  });

  it("the GitHub README has the Install section with the quarantine step", () => {
    assert.match(github, /## Install\n/);
    assert.match(github, /xattr -dr com\.apple\.quarantine \./);
  });

  it("the Store README has no install-from-source steps", () => {
    assert.doesNotMatch(store, /## Install|xattr|Download ZIP/);
  });

  it("every image the GitHub README links exists", () => {
    for (const [, path] of github.matchAll(/\]\(\.\.\/(media\/[^)]+)\)/g)) {
      assert.doesNotThrow(() => readFileSync(join(root, path)), path);
    }
  });
});
