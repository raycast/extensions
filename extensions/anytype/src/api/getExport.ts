import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { ObjectExport, Export } from "../helpers/schemas";

export async function getExport(spaceId: string, objectId: string, format: string): Promise<Export> {
  const tmpdir = os.tmpdir();
  const { url, method } = apiEndpoints.getExport(spaceId, objectId, format);

  const response = await apiFetch<ObjectExport>(url, {
    method: method,
    body: JSON.stringify({ path: tmpdir }),
  });

  // Find markdown file in the output directory
  const outputPath = response.path;
  const mdFile = fs.readdirSync(outputPath).find((file) => file.endsWith(".md"));
  if (!mdFile) throw new Error("Markdown file not found");

  // Read markdown file and replace relative image paths with absolute paths
  const markdown = fs.readFileSync(path.join(outputPath, mdFile), "utf8");
  const re = /\(files\/([^)]+)\)/g;
  const result = markdown.replace(re, `(file://${path.join(outputPath, "files", "$1")})`);

  return { markdown: result };
}
