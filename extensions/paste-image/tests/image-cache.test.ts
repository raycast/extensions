import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const localStorage = vi.hoisted(() => new Map<string, string>())

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => localStorage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      localStorage.set(key, value)
    }),
    removeItem: vi.fn(async (key: string) => {
      localStorage.delete(key)
    }),
  },
}))

import { IMAGE_METADATA_CACHE_KEY } from "../src/constants"
import {
  createCachedImage,
  createEmptyCache,
  getVisibleImages,
  isImageFile,
  loadImageMetadataCache,
  rebuildImageMetadataCache,
  removeCachedImage,
  replaceCachedImage,
  saveImageMetadataCache,
} from "../src/image-cache"
import { calculateContainedSize } from "../src/image-preview"
import { normalizeFolders, parseStoredFolders } from "../src/storage"

let temporaryFolders: string[] = []

beforeEach(() => {
  localStorage.clear()
})

afterEach(async () => {
  await Promise.all(temporaryFolders.map((folder) => rm(folder, { recursive: true, force: true })))
  temporaryFolders = []
})

async function createTemporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "paste-image-test-"))
  temporaryFolders.push(folder)
  return folder
}

describe("folder storage", () => {
  it("recovers from malformed or unexpected saved values", () => {
    expect(parseStoredFolders("not-json")).toEqual([])
    expect(parseStoredFolders(JSON.stringify({ folder: "/tmp/images" }))).toEqual([])
    expect(parseStoredFolders(JSON.stringify(["", 42, "/tmp/images"]))).toEqual(["/tmp/images"])
  })

  it("normalizes and deduplicates folder paths while preserving order", () => {
    expect(normalizeFolders(["/tmp/first", "/tmp/first/", "/tmp/second"])).toEqual(["/tmp/first", "/tmp/second"])
  })
})

describe("image discovery", () => {
  it("recognizes common modern and macOS image formats", () => {
    for (const file of ["photo.PNG", "photo.avif", "photo.heic", "photo.svg", "photo.tiff", "photo.webp"]) {
      expect(isImageFile(file)).toBe(true)
    }
    expect(isImageFile("notes.txt")).toBe(false)
    expect(isImageFile("png")).toBe(false)
  })

  it("scans regular image files, ignores other entries, and sorts naturally", async () => {
    const folder = await createTemporaryFolder()
    await Promise.all([
      writeFile(path.join(folder, "image10.png"), "ten"),
      writeFile(path.join(folder, "image2.png"), "two"),
      writeFile(path.join(folder, "photo.HEIC"), "heic"),
      writeFile(path.join(folder, "notes.txt"), "text"),
      mkdir(path.join(folder, "nested.jpg")),
    ])

    const cache = await rebuildImageMetadataCache([folder])

    expect(cache.allImages.map((image) => image.name)).toEqual(["image2.png", "image10.png", "photo.HEIC"])
    expect(cache.allImages[0]).toMatchObject({ folderPath: folder, size: 3 })
    expect(cache.folderErrors).toEqual({})
  })

  it("keeps unavailable folders visible and reports their errors", async () => {
    const missingFolder = path.join(await createTemporaryFolder(), "missing")
    const cache = await rebuildImageMetadataCache([missingFolder])

    expect(cache.folders).toEqual([missingFolder])
    expect(cache.imagesByFolder[missingFolder]).toEqual([])
    expect(cache.folderErrors[missingFolder]).toBeTruthy()
  })
})

describe("preview sizing", () => {
  it("fits portrait, landscape, and square images without cropping", () => {
    expect(calculateContainedSize(1_000, 2_000)).toEqual({ width: 120, height: 240 })
    expect(calculateContainedSize(2_000, 1_000)).toEqual({ width: 440, height: 220 })
    expect(calculateContainedSize(1_000, 1_000)).toEqual({ width: 240, height: 240 })
  })
})

describe("metadata cache", () => {
  it("rejects an obsolete cache and round-trips the current cache", async () => {
    localStorage.set(IMAGE_METADATA_CACHE_KEY, JSON.stringify({ version: 1, folders: [] }))
    expect(await loadImageMetadataCache()).toBeNull()

    localStorage.set(
      IMAGE_METADATA_CACHE_KEY,
      JSON.stringify({ version: 2, folders: ["/tmp/images"], imagesByFolder: { "/tmp/images": "invalid" } }),
    )
    expect(await loadImageMetadataCache()).toBeNull()

    const cache = createEmptyCache(["/tmp/images"])
    await saveImageMetadataCache(cache)
    expect(await loadImageMetadataCache()).toMatchObject({ version: 2, folders: ["/tmp/images"] })
  })

  it("replaces and removes renamed images without duplicating them", async () => {
    const folder = await createTemporaryFolder()
    const oldPath = path.join(folder, "old.png")
    const newPath = path.join(folder, "new.png")
    await writeFile(oldPath, "old")
    await writeFile(newPath, "new")

    const original = await createCachedImage(oldPath, folder)
    const renamed = await createCachedImage(newPath, folder)
    const cache = replaceCachedImage(
      {
        ...createEmptyCache([folder]),
        imagesByFolder: { [folder]: [original] },
        allImages: [original],
      },
      oldPath,
      renamed,
    )

    expect(getVisibleImages(cache, folder).map((image) => image.path)).toEqual([newPath])
    expect(removeCachedImage(cache, newPath).allImages).toEqual([])
  })
})
