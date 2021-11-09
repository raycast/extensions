import { environment } from "@raycast/api";
import { readdirSync, rmSync } from "fs";
import { resolve } from "path";
import { fetchPages } from "./http";

export default async function main(): Promise<void> {
    const dirs = readdirSync(environment.supportPath)
    for (const dir of dirs) {
        rmSync(resolve(environment.supportPath, dir), {recursive: true})
    }
    await fetchPages()
}
