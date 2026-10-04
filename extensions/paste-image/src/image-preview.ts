import { environment } from "@raycast/api"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import type { CachedImage } from "./image-cache"

const PREVIEW_FRAME = { width: 440, height: 240 } as const
const execFileAsync = promisify(execFile)

export function calculateContainedSize(
  sourceWidth: number,
  sourceHeight: number,
  maximumWidth = PREVIEW_FRAME.width,
  maximumHeight = PREVIEW_FRAME.height,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) return { width: maximumWidth, height: maximumHeight }

  const scale = Math.min(maximumWidth / sourceWidth, maximumHeight / sourceHeight)
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

export async function createImagePreview(image: CachedImage): Promise<string> {
  const previewDirectory = path.join(environment.supportPath, "image-previews")
  const previewKey = createHash("sha256")
    .update(`${image.path}:transparent-v1:${PREVIEW_FRAME.width}x${PREVIEW_FRAME.height}`)
    .digest("hex")
  const previewPath = path.join(previewDirectory, `${previewKey}.svg`)

  if (await isCurrentPreview(previewPath, image.modifiedAt)) return previewPath

  await mkdir(previewDirectory, { recursive: true })
  const temporaryPath = path.join(previewDirectory, `${previewKey}.resized.png`)

  try {
    const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", image.path], {
      encoding: "utf8",
    })
    const sourceWidth = readSipsDimension(stdout, "pixelWidth")
    const sourceHeight = readSipsDimension(stdout, "pixelHeight")
    const previewSize = calculateContainedSize(sourceWidth, sourceHeight)

    await execFileAsync("/usr/bin/sips", [
      "-s",
      "format",
      "png",
      "-z",
      String(previewSize.height),
      String(previewSize.width),
      image.path,
      "--out",
      temporaryPath,
    ])
    const resizedImage = await readFile(temporaryPath)
    const horizontalOffset = Math.round((PREVIEW_FRAME.width - previewSize.width) / 2)
    const verticalOffset = Math.round((PREVIEW_FRAME.height - previewSize.height) / 2)
    const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_FRAME.width}" height="${PREVIEW_FRAME.height}" viewBox="0 0 ${PREVIEW_FRAME.width} ${PREVIEW_FRAME.height}"><image x="${horizontalOffset}" y="${verticalOffset}" width="${previewSize.width}" height="${previewSize.height}" href="data:image/png;base64,${resizedImage.toString("base64")}" /></svg>`
    await writeFile(previewPath, previewSvg, "utf8")

    return previewPath
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

function readSipsDimension(output: string, dimension: "pixelWidth" | "pixelHeight"): number {
  const match = output.match(new RegExp(`${dimension}:\\s*(\\d+)`))
  if (!match) throw new Error(`Could not read image ${dimension}`)
  return Number(match[1])
}

async function isCurrentPreview(previewPath: string, sourceModifiedAt: number): Promise<boolean> {
  try {
    await access(previewPath)
    return (await stat(previewPath)).mtimeMs >= sourceModifiedAt
  } catch {
    return false
  }
}
