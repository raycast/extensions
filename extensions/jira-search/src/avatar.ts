import path from "path";
import {environment, ImageLike, showToast, ToastStyle} from "@raycast/api";
import {promises as fs} from "fs";
import {jiraFetch} from "./jira";
import {Warning} from "./exception";

interface AvatarSpec {
    type: string,
    id: string,
}

const avatarDir = path.join(environment.supportPath, "avatar")

async function isFile(path: string): Promise<boolean> {
    try {
        const stat = await fs.stat(path)
        return stat.isFile()
    } catch (err) {
        return false
    }
}

function filePath(avatar: AvatarSpec): string {
    return path.join(avatarDir, avatar.type, `${avatar.id}.png`)
}

async function downloadAvatar(avatar: AvatarSpec, filePath: string): Promise<string> {
    const urlPath = `rest/api/3/universal_avatar/view/type/${avatar.type}/avatar/${avatar.id}`
    const { dir } = path.parse(filePath)
    await fs.mkdir(dir, { recursive: true })
    const response = await jiraFetch(urlPath, { size: "medium", format: "png" })
    const body = await response.arrayBuffer()
    await fs.writeFile(filePath, new DataView(body))
    return filePath
}

function parseAvatarUrl(url: string): AvatarSpec {
    const pattern = /.*\/universal_avatar\/view\/type\/([a-z]+)\/avatar\/([0-9]+)/
    const match = url.match(pattern)
    if (!match) throw new Warning(`Unexpected icon path ${url}`)
    return { type: match[1], id: match[2] }
}

export async function jiraAvatarImage(url: string): Promise<ImageLike | undefined> {
    try {
        const avatar = parseAvatarUrl(url)
        const path = filePath(avatar)
        const isAvailable = await isFile(path)
        return isAvailable ? path : await downloadAvatar(avatar, path)
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

export default async function ClearAvatarCache() {
    await fs.rm(avatarDir, { force: true, recursive: true })
    await showToast(ToastStyle.Success, "Reload Icons", "Icons successfully reloaded")
}