import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_CONFIG } from "../service/protocol";
import { selectedPath } from "../service/selection";

// Explicit child selection must win over an ancestor exclusion, matching the native crawl contract.
test("selection honors chosen descendants and their own exclusions", () => {
  const config = {
    ...DEFAULT_CONFIG,
    roots: ["/docs/media/courses"],
    excludedFolders: ["/docs/media", "/docs/media/courses/private"],
    excludedExtensions: ["pdf"],
  };
  assert.equal(selectedPath(config, "/docs/media/courses/lesson.txt"), true);
  assert.equal(
    selectedPath(config, "/docs/media/courses/private/notes.txt"),
    false,
  );
  assert.equal(selectedPath(config, "/docs/media/courses/notes.PDF"), false);
  assert.equal(
    selectedPath(config, "/docs/media/courses-other/lesson.txt"),
    false,
  );
});

// Match NSString.pathExtension for hidden and extensionless leaf names, not dots in parent folders.
test("extension exclusions use the leaf filename extension", () => {
  const config = {
    ...DEFAULT_CONFIG,
    roots: ["/docs"],
    excludedExtensions: ["gitignore", "txt", "md"],
  };
  assert.equal(selectedPath(config, "/docs/.gitignore"), true);
  assert.equal(selectedPath(config, "/docs/txt"), true);
  assert.equal(selectedPath(config, "/docs/folder.md/README"), true);
  assert.equal(selectedPath(config, "/docs/notes.TXT"), false);
});
