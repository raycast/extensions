import { promises as fs } from "node:fs";
import path from "node:path";
import { extractText } from "unpdf";
export async function extractDocument(file: string): Promise<{ text: string; truncated: boolean }> {
  const info = await fs.lstat(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Choose a regular file.");
  if (info.size > 10 * 1024 * 1024)
    throw new Error("AI suggestions support files up to 10 MB. You can still file this document manually.");
  const ext = path.extname(file).toLowerCase();
  let text: string;
  if (ext === ".pdf") {
    const result = await extractText(new Uint8Array(await fs.readFile(file)), { mergePages: true });
    text = result.text;
  } else if ([".txt", ".md", ".markdown", ".csv", ".json", ".log", ".yaml", ".yml", ".html", ".htm"].includes(ext))
    text = await fs.readFile(file, "utf8");
  else
    throw new Error(
      "AI suggestions support text files and text-based PDFs. Choose a destination manually for this file.",
    );
  if (!text.trim()) throw new Error("No readable text. Scanned PDFs need OCR; choose a destination manually.");
  return { text: text.slice(0, 24000), truncated: text.length > 24000 };
}
