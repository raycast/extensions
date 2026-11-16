const fs = require("node:fs/promises");
const path = require("node:path");
const { createStorageLock } = require("../.test-dist/storage-lock");
const dir = process.argv[2];
const lock = createStorageLock(dir);
(async () => {
  for (let i = 0; i < 8; i++)
    await lock(async () => {
      const filename = path.join(dir, "counter.json");
      const count = JSON.parse(await fs.readFile(filename, "utf8"));
      await new Promise((resolve) => setTimeout(resolve, 3));
      await fs.writeFile(filename, JSON.stringify(count + 1));
    });
})().catch(() => {
  process.exitCode = 1;
});
