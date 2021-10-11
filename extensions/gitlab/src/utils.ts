import { getLocalStorageItem, ImageLike, ImageMask, setLocalStorageItem } from "@raycast/api";
import { Project } from "./gitlabapi";
import { GitLabIcons } from "./icons";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { constants } from 'fs';
import * as crypto from "crypto";

export function projectIconUrl(project: Project): string | undefined {
    let result: string | undefined;
    // TODO check also namespace for icon
    if (project.avatar_url) {
        result = project.avatar_url;
    } else if (project.owner && project.owner.avatar_url) {
        result = project.owner.avatar_url;
    }
    return result;
}

export function projectIcon(project: Project): ImageLike {
    let result: string = GitLabIcons.project;
    // TODO check also namespace for icon
    if (project.avatar_url) {
        result = project.avatar_url;
    } else if (project.owner && project.owner.avatar_url) {
        result = project.owner.avatar_url;
    }
    return { source: result, mask: ImageMask.Circle };
}

export function toDateString(d: Date) {
    let mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
    let da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
    return `${da}. ${mo}`;
}

export function getIdFromGqlId(id: string) {
    const splits = id.split("/");
    return parseInt(splits.pop() || "");
}

export function currentSeconds(): number {
    return Date.now() / 1000;
}

export async function getCacheObject(key: string, seconds: number): Promise<any> {
    console.log(`get cache object ${key} from store`);
    const cache = await getLocalStorageItem(key);
    console.log("after local storage");
    console.log(cache);
    if (cache) {
        const cache_data = JSON.parse(cache.toString());
        const timestamp = currentSeconds();
        const delta = timestamp - cache_data.timestamp;
        if (delta > seconds) {
            return undefined;
        } else {
            return cache_data.payload;
        }
    }
    return undefined;
}

export async function setCacheObject(key: string, payload: any) {
    const cache_data = {
        timestamp: currentSeconds(),
        payload: payload
    };
    console.log(key);
    console.log(cache_data);
    const text = JSON.stringify(cache_data);
    console.log(text.length);
    await setLocalStorageItem(key, text);
}

export async function fileExists(filename: string): Promise<boolean> {
    return fs.access(filename, constants.F_OK | constants.W_OK | constants.R_OK)
        .then(() => true)
        .catch(() => false);
}

export function fileExistsSync(filename: string): boolean {
    try {
        fsSync.accessSync(filename, constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
}

export function replaceAll(str: string, find: RegExp, replace: string) {
    return str.replace(find, replace);
}

export function optimizeMarkdownText(text: string): string {
    let result = text;
    // remove html comments
    result = replaceAll(result, /<!--[\s\S]*?-->/g, '');

    // remove cc
    result = replaceAll(result, /^\/cc.*/gm, '');

    // <br> to markdown new line
    result = replaceAll(result, /<br>/g, '  \n');

    return result;
}

export function hashString(text: string): string {
    const sha256 = crypto.createHash("sha256");
    sha256.update(text);
    return sha256.digest("hex");
}

export function hashRecord(rec: Record<string, any>, prefix?: string | undefined): string {
    const sha256 = crypto.createHash("sha256");
    Object.entries(rec).sort().forEach((k: any, v: any) => { sha256.update(`${k}${v}`); })
    const h = sha256.digest("hex");
    if (prefix) {
        return `${prefix}_${h}`;
    } else {
        return h;
    }
}

export function capitalizeFirstLetter(name: string) {
    return name.replace(/^./, name[0].toUpperCase())
}

export function toFormValues(values: any): Record<string, any> {
    let val: Record<string, any> = {};
    for (const [k, v] of Object.entries(values)) {
        if (v) {
            if (Array.isArray(v)) {
                if (v.length > 0) {
                    val[k] = v.join(",");
                } else {
                    continue;
                }
            } else {
                val[k] = v;
            }
        }
    }
    return val;
}