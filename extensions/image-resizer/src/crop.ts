import { basename, dirname, extname, join } from "node:path"

import { Jimp } from "jimp"

export const MAX_BYTES = 80 * 1024 * 1024

export type CropResult = {
  outputPath: string
  width: number
  height: number
}

export function targetHeightForWidth(width: number): number {
  return Math.round((width * 10) / 16)
}

function buildOutputPath(inputPath: string, outputDirectory: string): string {
  const parsedExtension = extname(inputPath)
  const baseName = basename(inputPath, parsedExtension)
  return join(outputDirectory, `${baseName}-top-16x10.png`)
}

export async function cropTop16x10(
  inputPath: string,
  outputDirectory?: string
): Promise<CropResult> {
  const image = await Jimp.read(inputPath)

  if (!image.width || !image.height) {
    throw new Error("Could not read the image dimensions.")
  }

  const targetHeight = targetHeightForWidth(image.width)

  if (image.height < targetHeight) {
    throw new Error(
      `Image is too short for 16:10 at full width. Need at least ${targetHeight}px height; image is ${image.height}px.`
    )
  }

  const outputPath = buildOutputPath(
    inputPath,
    outputDirectory ?? dirname(inputPath)
  )

  await image
    .crop({ x: 0, y: 0, w: image.width, h: targetHeight })
    .write(outputPath as `${string}.png`)

  return {
    outputPath,
    width: image.width,
    height: targetHeight,
  }
}
