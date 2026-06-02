import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment, open } from "@raycast/api";
import {
  renderReferenceCardHtml,
  type ReferenceCardInput,
} from "./reference-card-model";

export async function openReferenceCard(
  input: ReferenceCardInput,
): Promise<string> {
  const dir = join(environment.supportPath, "reference-cards");
  await mkdir(dir, { recursive: true });
  const filePath = join(
    dir,
    `analysis-reference-${new Date().toISOString().replace(/[:.]/g, "-")}.html`,
  );
  await writeFile(filePath, renderReferenceCardHtml(input), "utf8");
  await open(filePath);
  return filePath;
}
