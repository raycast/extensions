import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { createStorePersistence } from "../../src/lib/store-persistence.ts";

const [directory, id] = process.argv.slice(2);
const persistence = createStorePersistence(
  {
    async getItem(key) {
      try {
        const raw = await readFile(join(directory, key), "utf8");
        // Widen the read/write race so an unguarded update loses changes.
        await setTimeout(50);
        return raw;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    },
    setItem: (key, value) => writeFile(join(directory, key), value),
  },
  join(directory, "store-write"),
);
process.send?.("ready");
process.once("message", async () => {
  try {
    await persistence.update((store) => ({
      ...store,
      templates: [...store.templates, { id, label: id, body: id }],
    }));
    process.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
