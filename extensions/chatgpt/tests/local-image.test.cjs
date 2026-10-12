const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { localImageTurnInput } = require("../src/utils/local-image.ts");

test("Codex image input preserves an existing local path", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-local-image-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const image = path.join(root, "example image.png");
  await fs.writeFile(image, "fixture");
  assert.deepEqual(await localImageTurnInput(image), { type: "localImage", path: image });
  assert.deepEqual(await localImageTurnInput(pathToFileURL(image).href), { type: "localImage", path: image });
  await assert.rejects(localImageTurnInput(root), /not a file/);
});
