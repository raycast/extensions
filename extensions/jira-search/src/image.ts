import path from "path"
import { environment, ImageLike, showToast, ToastStyle } from "@raycast/api"
import { promises as fs } from "fs"
import { jiraFetch } from "./jira"
import { Warning } from "./exception"

interface ImageSpec {
  urlPath: string
  imageType: string
  key: string
}

const imageDir = path.join(environment.supportPath, "image")

async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path)
    return stat.isFile()
  } catch (err) {
    return false
  }
}

function filePath(image: ImageSpec): string {
  return path.join(imageDir, image.imageType, `${image.key}.png`)
}

async function downloadImage(image: ImageSpec, filePath: string): Promise<string> {
  const { dir } = path.parse(filePath)
  await fs.mkdir(dir, { recursive: true })
  const response = await jiraFetch(image.urlPath)
  const body = await response.arrayBuffer()
  await fs.writeFile(filePath, new DataView(body))
  return filePath
}

function parseImageUrl(url: string): ImageSpec {
  type UrlMatcher = { pattern: RegExp; spec: (matchGroup: { [p: string]: string }) => ImageSpec }
  const matcher: UrlMatcher[] = [
    {
      pattern: /.*\/universal_avatar\/view\/type\/(?<imageType>[a-z]+)\/avatar\/(?<key>[0-9]+)/i,
      spec: (g) => ({
        urlPath: `rest/api/3/universal_avatar/view/type/${g.imageType}/avatar/${g.key}?format=png&size=medium`,
        imageType: g.imageType,
        key: g.key,
      }),
    },
    {
      pattern: /\/images\/icons\/(?<imageType>[a-z]+)\/(?<key>[a-z.]+)/i,
      spec: (g) => ({
        urlPath: `images/icons/${g.imageType}/${g.key}?format=png&size=medium`,
        imageType: g.imageType,
        key: g.key,
      }),
    },
  ]
  const imgSpec = matcher
    .map((m) => ({ matcher: m, match: url.match(m.pattern) }))
    .map((m) => (m.match && m.match.groups ? m.matcher.spec(m.match.groups) : undefined))
    .find((imgSpec) => imgSpec !== undefined)
  if (!imgSpec) throw new Warning(`Unexpected icon path ${url}`)
  return imgSpec
}

export async function jiraImage(url: string): Promise<ImageLike | undefined> {
  try {
    const imageSpec = parseImageUrl(url)
    const path = filePath(imageSpec)
    const isAvailable = await isFile(path)
    return isAvailable ? path : await downloadImage(imageSpec, path)
  } catch (e) {
    if (e instanceof Warning) {
      console.warn(e)
      return url
    } else {
      console.error(e)
      await showToast(ToastStyle.Failure, "Failed to get Jira Icons", e instanceof Error ? e.message : undefined)
      return undefined
    }
  }
}

export default async function ClearImageCache() {
  await fs.rm(imageDir, { force: true, recursive: true })
  await showToast(ToastStyle.Success, "Image Cache cleared", "Image will be reloaded on next search")
}
