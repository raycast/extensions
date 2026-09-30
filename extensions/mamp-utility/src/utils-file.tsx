import { readdirSync, statSync } from "fs";
import { join } from "path";
import untildify from "untildify";

export function getFiles(_path_: string): { file: string; path: string; lastModifiedAt: Date }[] {
  const files = readdirSync(untildify(_path_));
  return files
    .filter((file) => !file.startsWith("."))
    .map((file) => {
      const path = join(_path_, file);
      const lastModifiedAt = statSync(path).mtime;
      return { file, path, lastModifiedAt };
    })
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
}
