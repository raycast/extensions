import { environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { Dataset, DatasetMeta, ReferenceIndexItem } from "../types";

const META_FILENAME = "meta.json";
const INDEX_FILENAME = "index.json";
const CONTENT_FILENAME = "content.json";

export class DatasetRepository {
  private readonly supportDir = path.join(environment.supportPath, "data");

  async load(): Promise<Dataset | undefined> {
    return this.readFromSupport();
  }

  async hasData(): Promise<boolean> {
    const metaPath = path.join(this.supportDir, META_FILENAME);
    return pathExists(metaPath);
  }

  async save(dataset: Dataset): Promise<void> {
    await fs.promises.mkdir(this.supportDir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(
        path.join(this.supportDir, META_FILENAME),
        JSON.stringify(dataset.meta, null, 2),
        "utf8",
      ),
      fs.promises.writeFile(
        path.join(this.supportDir, INDEX_FILENAME),
        JSON.stringify(dataset.index, null, 2),
        "utf8",
      ),
      fs.promises.writeFile(
        path.join(this.supportDir, CONTENT_FILENAME),
        JSON.stringify(dataset.content, null, 2),
        "utf8",
      ),
    ]);
  }

  getSupportDir(): string {
    return this.supportDir;
  }

  private async readFromSupport(): Promise<Dataset | undefined> {
    const metaPath = path.join(this.supportDir, META_FILENAME);
    const indexPath = path.join(this.supportDir, INDEX_FILENAME);
    const contentPath = path.join(this.supportDir, CONTENT_FILENAME);

    const exists = await pathExists(metaPath);
    if (!exists) return undefined;

    try {
      const [metaRaw, indexRaw, contentRaw] = await Promise.all([
        fs.promises.readFile(metaPath, "utf8"),
        fs.promises.readFile(indexPath, "utf8"),
        fs.promises.readFile(contentPath, "utf8"),
      ]);

      const meta = JSON.parse(metaRaw) as DatasetMeta;
      const index = JSON.parse(indexRaw) as ReferenceIndexItem[];
      const content = JSON.parse(contentRaw) as Record<string, string>;

      return { meta, index, content };
    } catch (error) {
      console.error("[dataset] Failed to read support dataset", error);
      return undefined;
    }
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.promises.access(target, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
