import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  docusaurusHeadingId,
  pinnedRawDocumentUrl,
  sliceRequiredSection,
  slugify,
} from "../scripts/sync-utils.mjs";
import type { GeneratedCheatsheetData } from "../src/types.ts";

test("keeps stable item IDs separate from Docusaurus heading IDs", () => {
  assert.equal(slugify("Tools & Skills"), "tools-skills");
  assert.equal(docusaurusHeadingId("Tools & Skills"), "tools--skills");
});

test("builds immutable raw-document URLs from the resolved source commit", () => {
  assert.equal(
    pinnedRawDocumentUrl("abc123", "website/docs/reference/cli-commands.md"),
    "https://raw.githubusercontent.com/NousResearch/hermes-agent/abc123/website/docs/reference/cli-commands.md",
  );
});

test("fails fast when an upstream section heading changes", () => {
  assert.equal(sliceRequiredSection("before\n## Start\nbody\n## End\nafter", "## Start", "## End"), "## Start\nbody\n");
  assert.throws(() => sliceRequiredSection("## Different\nbody", "## Start", "## End"), /required section/);
});

test("uses the live Docusaurus fragment for every Tools & Skills slash command", async () => {
  const dataPath = fileURLToPath(new URL("../src/data/generated.json", import.meta.url));
  const data = JSON.parse(await readFile(dataPath, "utf8")) as GeneratedCheatsheetData;
  const toolAndSkillItems = data.items.filter(
    (item) => item.category === "slash" && item.documentationUrl.includes("#tools"),
  );

  assert.ok(toolAndSkillItems.length >= 17, "expected the deduplicated Tools & Skills slash-command group");
  assert.ok(
    toolAndSkillItems.every(
      (item) =>
        item.documentationUrl ===
        "https://hermes-agent.nousresearch.com/docs/reference/slash-commands#tools--skills",
    ),
  );
});
