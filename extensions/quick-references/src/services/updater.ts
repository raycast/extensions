import AdmZip from "adm-zip";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatasetRepository } from "../core/dataset-repository";
import { buildDatasetFromDir } from "../ingest/generator";
import { Dataset } from "../types";

const ZIP_URL =
  "https://codeload.github.com/Fechin/reference/zip/refs/heads/main";

export class ReferenceUpdater {
  constructor(private readonly repository = new DatasetRepository()) {}

  async update(): Promise<Dataset> {
    const buffer = await downloadZip();
    const workspace = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "quickreferences-"),
    );

    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(workspace, true);
      const root = await resolveExtractedRoot(workspace);
      const postsDir = path.join(root, "source", "_posts");
      const dataset = await buildDatasetFromDir(postsDir, {
        sourceLabel: "Fechin/reference",
        version: new Date().toISOString(),
      });
      await this.repository.save(dataset);
      return dataset;
    } finally {
      await fs.promises.rm(workspace, { recursive: true, force: true });
    }
  }
}

async function downloadZip(): Promise<Buffer> {
  const response = await fetch(ZIP_URL);
  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status}): ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resolveExtractedRoot(workspace: string): Promise<string> {
  const entries = await fs.promises.readdir(workspace, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());

  if (directories.length === 0) {
    throw new Error("Unexpected zip layout: no directories found");
  }

  return path.join(workspace, directories[0].name);
}
