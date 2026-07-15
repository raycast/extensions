import { runAppleScript } from "@raycast/utils";
import { existsSync, readdirSync, statSync } from "fs";
import { readdir, stat } from "fs/promises";
import mime from "mime-types";
import { join } from "path";

const isHidden = (item: string) => {
  return item === "Icon\r" || /(^|\/)\.[^/.]/g.test(item);
};

export const getDirectoryItems = async (dir: string): Promise<{ files: string[]; subDirectories: string[] }> => {
  const directoryItems = await readdir(dir, { withFileTypes: true });

  const files = directoryItems
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((item) => !isHidden(item))
    .sort((a, b) => a.localeCompare(b));

  const subDirectories = directoryItems
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((item) => !isHidden(item))
    .sort((a, b) => a.localeCompare(b));

  return { files, subDirectories };
};

export const formatFileSize = (size: number): string => {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = size;

  if (i < 0) return "0";

  let j = 0;
  while (i > 1024) {
    i /= 1024;
    j++;
  }

  return i.toFixed(1) + " " + sizes[j];
};

export const maximumFileSize = {
  label: "20 MB",
  value: 20971520,
};

export const getSize = async (paths: string[]): Promise<number> => {
  const promises = paths
    .filter((path: string) => existsSync(path))
    .map(async (path: string) => {
      const item = statSync(path);
      if (item.isFile()) {
        return item.size;
      } else {
        return getDirectorySize(path, 0);
      }
    });

  const sizes = await Promise.all(promises);
  const size = sizes.reduce((a: number, b: number) => a + b, 0);

  return size;
};

export const getSizeSync = (paths: string[]): number => {
  const sizes = paths
    .filter((path: string) => existsSync(path))
    .map((path: string) => {
      const item = statSync(path);
      if (item.isFile()) {
        return item.size;
      } else {
        return getDirectorySizeSync(path, 0);
      }
    });

  const size = sizes.reduce((a: number, b: number) => a + b, 0);

  return size;
};

const maximumRecursionDepth = 4;
export const getDirectorySize = async (dir: string, depth: number) => {
  if (depth > maximumRecursionDepth) return 0;

  const files = await readdir(dir, { withFileTypes: true });
  const paths: Promise<number>[] = files.map(async (file) => {
    const path = join(dir, file.name);
    if (file.isDirectory()) {
      return await getDirectorySize(path, depth + 1);
    }

    if (file.isFile()) {
      const { size } = await stat(path);
      return size;
    }

    return 0;
  });

  return (await Promise.all(paths)).flat(Infinity).reduce((i, size) => i + size, 0);
};

export const getDirectorySizeSync = (dir: string, depth: number) => {
  if (depth > maximumRecursionDepth) return 0;

  const files = readdirSync(dir, { withFileTypes: true });
  const paths: number[] = files.map((file) => {
    const path = join(dir, file.name);
    if (file.isDirectory()) {
      return getDirectorySizeSync(path, depth + 1);
    }

    if (file.isFile()) {
      const { size } = statSync(path);
      return size;
    }

    return 0;
  });

  return paths.flat(Infinity).reduce((i, size) => i + size, 0);
};

export const getMIMEtype = (extension: string | undefined): string | undefined => {
  if (!extension) return undefined;
  const mimeType: string | false = mime.lookup(extension);

  if (mimeType) return mimeType.split("/")[0];
  else return undefined;
};

export async function getFinderSelection(): Promise<string[]> {
  const script = `
    tell application "Finder"
      set theItems to selection
    end tell
    set itemsPaths to ""
    repeat with itemRef in theItems
      set theItem to POSIX path of (itemRef as string)
      set itemsPaths to itemsPaths & theItem & return
    end repeat
    return itemsPaths
  `;

  const response = await runAppleScript(script);
  return response === "" ? [] : response.split("\r");
}
