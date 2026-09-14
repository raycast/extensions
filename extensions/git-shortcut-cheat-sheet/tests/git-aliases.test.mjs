import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalogUrl = new URL("../src/git-aliases.json", import.meta.url);

async function readCatalog() {
  return JSON.parse(await readFile(catalogUrl, "utf8"));
}

test("bundles the Oh My Zsh git status alias", async () => {
  const aliases = await readCatalog();

  assert.deepEqual(
    aliases.find((entry) => entry.alias === "gst"),
    {
      alias: "gst",
      command: "git status",
    },
  );
});

test("keeps commands searchable by their expanded git text", async () => {
  const aliases = await readCatalog();
  const searchableText = aliases.map(({ alias, command }) => `${alias} ${command}`.toLowerCase());

  assert(searchableText.some((text) => text.includes("git status")));
});
