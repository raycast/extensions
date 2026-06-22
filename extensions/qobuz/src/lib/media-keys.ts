import { environment } from "@raycast/api"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { promisify } from "node:util"

const exec = promisify(execFile)

export type MediaKey = "play" | "next" | "previous" | "forward" | "rewind"

const sourcePath = join(environment.assetsPath, "media-key.swift")
const binaryPath = join(tmpdir(), "qobuz-raycast", "media-key")

const ensureBinary = async (): Promise<string> => {
  if (existsSync(binaryPath)) return binaryPath
  await mkdir(dirname(binaryPath), { recursive: true })
  await exec("swiftc", ["-O", sourcePath, "-o", binaryPath])
  return binaryPath
}

export const sendMediaKey = async (key: MediaKey): Promise<void> => {
  const binary = await ensureBinary()
  try {
    await exec(binary, [key])
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr
    throw new Error(stderr?.trim() || `failed to send media key: ${key}`)
  }
}
