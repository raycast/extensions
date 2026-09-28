import { environment, getPreferenceValues } from "@raycast/api";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createCatalogLoader } from "./catalog-store";

const directory = join(environment.supportPath, "catalog");
const load = createCatalogLoader({
  storage: {
    read: async (key) => JSON.parse(await readFile(join(directory, key), "utf8")),
    write: async (key, value) => {
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `${key}.${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(value));
      await rename(temporary, join(directory, key));
    },
  },
  fetchJson: async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Museum returned HTTP ${response.status}`);
    return response.json();
  },
});

export function getCatalog(force = false) {
  return load(Number(getPreferenceValues<Preferences>().refreshInterval) * 60 * 60 * 1000, force);
}
