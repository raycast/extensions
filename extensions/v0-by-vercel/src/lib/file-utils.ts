import * as fs from "fs/promises";
import * as path from "path";

export interface FileContent {
  name: string;
  content: string;
}

export async function readFilesFromPaths(paths: string[]): Promise<FileContent[]> {
  const filesContent: FileContent[] = [];

  for (const filePath of paths) {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const dirContents = await fs.readdir(filePath);
      const fullPaths = dirContents.map((name) => path.join(filePath, name));
      filesContent.push(...(await readFilesFromPaths(fullPaths)));
    } else if (stats.isFile()) {
      const content = await fs.readFile(filePath, "utf-8");
      filesContent.push({
        name: path.basename(filePath),
        content: content,
      });
    }
  }

  return filesContent;
}
