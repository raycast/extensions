import { constants } from "node:fs"
import { copyFile, link, unlink } from "node:fs/promises"
import path from "node:path"

export function isFileCollision(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST"
}

export async function renameWithoutOverwrite(source: string, destination: string): Promise<void> {
  await link(source, destination)

  try {
    await unlink(source)
  } catch (error) {
    try {
      await unlink(destination)
    } catch {
      // Keep the original unlink error. A cleanup failure is safer than deleting the source.
    }
    throw error
  }
}

export async function copyToAvailablePath(source: string, desiredPath: string): Promise<string> {
  const extension = path.extname(desiredPath)
  const baseName = path.basename(desiredPath, extension)
  const directory = path.dirname(desiredPath)

  for (let copyNumber = 1; ; copyNumber += 1) {
    const destination = copyNumber === 1 ? desiredPath : path.join(directory, `${baseName} ${copyNumber}${extension}`)

    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL)
      return destination
    } catch (error) {
      if (!isFileCollision(error)) throw error
    }
  }
}
