import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
export async function saveCopy(
  source: string,
  directory: string,
  filename: string,
): Promise<string> {
  const name = filename.trim();
  if (!isAbsolute(directory)) throw new Error("Choose a destination folder.");
  if (
    !name ||
    name === "." ||
    name === ".." ||
    basename(name) !== name ||
    /[\\/:\0]/.test(name)
  )
    throw new Error("Enter a filename without folder separators.");
  if (extname(name).toLowerCase() !== extname(source).toLowerCase())
    throw new Error(
      `Keep the ${extname(source)} extension; Save As does not convert image formats.`,
    );
  const destination = join(directory, name);
  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        "A file with that name already exists. Choose another name.",
      );
    throw error;
  }
  return destination;
}
