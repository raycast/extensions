import { LocalStorage } from "@raycast/api"
import { access, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { ALL_FOLDERS_VIEW, IMAGE_METADATA_CACHE_KEY } from "./constants"
import { normalizeFolders } from "./storage"

const CACHE_VERSION = 2
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
])

export type CachedImage = {
  name: string
  path: string
  folderPath: string
  size: number
  modifiedAt: number
}

export type ImageMetadataCache = {
  version: 2
  folders: string[]
  imagesByFolder: Record<string, CachedImage[]>
  allImages: CachedImage[]
  folderErrors: Record<string, string>
  updatedAt: number
}

export function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLocaleLowerCase())
}

function sortImages(images: CachedImage[]): CachedImage[] {
  return [...images].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }),
  )
}

function buildCache(
  folders: string[],
  imagesByFolder: Record<string, CachedImage[]>,
  folderErrors: Record<string, string> = {},
): ImageMetadataCache {
  const normalizedFolders = normalizeFolders(folders)
  const normalizedImages = Object.fromEntries(
    normalizedFolders.map((folderPath) => [folderPath, sortImages(imagesByFolder[folderPath] ?? [])]),
  )

  return {
    version: CACHE_VERSION,
    folders: normalizedFolders,
    imagesByFolder: normalizedImages,
    allImages: sortImages(normalizedFolders.flatMap((folderPath) => normalizedImages[folderPath] ?? [])),
    folderErrors: Object.fromEntries(
      Object.entries(folderErrors).filter(([folderPath]) => normalizedFolders.includes(folderPath)),
    ),
    updatedAt: Date.now(),
  }
}

export function createEmptyCache(folders: string[] = []): ImageMetadataCache {
  return buildCache(folders, {})
}

async function scanFolder(folderPath: string): Promise<CachedImage[]> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const imageEntries = entries.filter((entry) => entry.isFile() && isImageFile(entry.name))
  const images = await Promise.all(
    imageEntries.map(async (entry): Promise<CachedImage | null> => {
      const imagePath = path.join(folderPath, entry.name)
      try {
        const metadata = await stat(imagePath)
        return {
          name: entry.name,
          path: imagePath,
          folderPath,
          size: metadata.size,
          modifiedAt: metadata.mtimeMs,
        }
      } catch {
        return null
      }
    }),
  )

  return images.filter((image): image is CachedImage => image !== null)
}

async function scanFolders(folders: string[]): Promise<{
  imagesByFolder: Record<string, CachedImage[]>
  folderErrors: Record<string, string>
}> {
  const results = await Promise.allSettled(
    folders.map(async (folderPath) => ({ folderPath, images: await scanFolder(folderPath) })),
  )
  const imagesByFolder: Record<string, CachedImage[]> = {}
  const folderErrors: Record<string, string> = {}

  results.forEach((result, index) => {
    const folderPath = folders[index]
    if (result.status === "fulfilled") {
      imagesByFolder[folderPath] = result.value.images
    } else {
      imagesByFolder[folderPath] = []
      folderErrors[folderPath] = result.reason instanceof Error ? result.reason.message : "Folder is unavailable"
    }
  })

  return { imagesByFolder, folderErrors }
}

export async function loadImageMetadataCache(): Promise<ImageMetadataCache | null> {
  const storedCache = await LocalStorage.getItem<string>(IMAGE_METADATA_CACHE_KEY)
  if (!storedCache) return null

  try {
    const parsed: unknown = JSON.parse(storedCache)
    if (!isValidCache(parsed)) return null
    return buildCache(parsed.folders, parsed.imagesByFolder, parsed.folderErrors)
  } catch {
    return null
  }
}

function isValidCache(value: unknown): value is ImageMetadataCache {
  if (!value || typeof value !== "object") return false
  const cache = value as Partial<ImageMetadataCache>
  return (
    cache.version === CACHE_VERSION &&
    Array.isArray(cache.folders) &&
    cache.folders.every((folder) => typeof folder === "string") &&
    Boolean(cache.imagesByFolder) &&
    typeof cache.imagesByFolder === "object" &&
    Object.values(cache.imagesByFolder).every(
      (images) => Array.isArray(images) && images.every((image) => isValidCachedImage(image)),
    ) &&
    Boolean(cache.folderErrors) &&
    typeof cache.folderErrors === "object" &&
    Object.values(cache.folderErrors).every((message) => typeof message === "string")
  )
}

function isValidCachedImage(value: unknown): value is CachedImage {
  if (!value || typeof value !== "object") return false
  const image = value as Partial<CachedImage>
  return (
    typeof image.name === "string" &&
    typeof image.path === "string" &&
    typeof image.folderPath === "string" &&
    typeof image.size === "number" &&
    Number.isFinite(image.size) &&
    typeof image.modifiedAt === "number" &&
    Number.isFinite(image.modifiedAt)
  )
}

export async function saveImageMetadataCache(cache: ImageMetadataCache): Promise<void> {
  await LocalStorage.setItem(IMAGE_METADATA_CACHE_KEY, JSON.stringify(cache))
}

export async function clearImageMetadataCache(): Promise<void> {
  await LocalStorage.removeItem(IMAGE_METADATA_CACHE_KEY)
}

export function foldersMatchCache(cache: ImageMetadataCache | null, folders: string[]): boolean {
  if (!cache) return false
  const normalizedFolders = normalizeFolders(folders)
  return (
    cache.folders.length === normalizedFolders.length &&
    cache.folders.every((folderPath, index) => folderPath === normalizedFolders[index])
  )
}

export async function rebuildImageMetadataCache(folders: string[]): Promise<ImageMetadataCache> {
  const normalizedFolders = normalizeFolders(folders)
  const { imagesByFolder, folderErrors } = await scanFolders(normalizedFolders)
  return buildCache(normalizedFolders, imagesByFolder, folderErrors)
}

export async function refreshFolderInCache(
  cache: ImageMetadataCache,
  folderPath: string,
  folders: string[] = cache.folders,
): Promise<ImageMetadataCache> {
  const normalizedFolders = normalizeFolders(folders)
  const imagesByFolder = Object.fromEntries(
    normalizedFolders.map((currentFolder) => [currentFolder, cache.imagesByFolder[currentFolder] ?? []]),
  )
  const folderErrors = { ...cache.folderErrors }

  if (normalizedFolders.includes(folderPath)) {
    try {
      imagesByFolder[folderPath] = await scanFolder(folderPath)
      delete folderErrors[folderPath]
    } catch (error) {
      imagesByFolder[folderPath] = []
      folderErrors[folderPath] = error instanceof Error ? error.message : "Folder is unavailable"
    }
  }

  return buildCache(normalizedFolders, imagesByFolder, folderErrors)
}

export function getVisibleImages(cache: ImageMetadataCache, viewFolder: string): CachedImage[] {
  return viewFolder === ALL_FOLDERS_VIEW ? cache.allImages : (cache.imagesByFolder[viewFolder] ?? [])
}

export function findCachedImage(cache: ImageMetadataCache, imagePath: string): CachedImage | undefined {
  return cache.allImages.find((image) => image.path === imagePath)
}

export async function createCachedImage(imagePath: string, folderPath: string): Promise<CachedImage> {
  const metadata = await stat(imagePath)
  return {
    name: path.basename(imagePath),
    path: imagePath,
    folderPath,
    size: metadata.size,
    modifiedAt: metadata.mtimeMs,
  }
}

export function replaceCachedImage(
  cache: ImageMetadataCache,
  oldPath: string,
  nextImage: CachedImage,
): ImageMetadataCache {
  const currentImages = cache.imagesByFolder[nextImage.folderPath] ?? []
  const folderImages = currentImages.some((image) => image.path === oldPath)
    ? currentImages.map((image) => (image.path === oldPath ? nextImage : image))
    : [...currentImages, nextImage]

  return buildCache(
    cache.folders,
    { ...cache.imagesByFolder, [nextImage.folderPath]: folderImages },
    cache.folderErrors,
  )
}

export function removeCachedImage(cache: ImageMetadataCache, imagePath: string): ImageMetadataCache {
  const existingImage = findCachedImage(cache, imagePath)
  if (!existingImage) return cache

  return buildCache(
    cache.folders,
    {
      ...cache.imagesByFolder,
      [existingImage.folderPath]: (cache.imagesByFolder[existingImage.folderPath] ?? []).filter(
        (image) => image.path !== imagePath,
      ),
    },
    cache.folderErrors,
  )
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export { ALL_FOLDERS_VIEW }
