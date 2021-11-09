import { environment, showToast, ToastStyle } from "@raycast/api";
import { readdirSync, rmSync } from "fs";
import { resolve } from "path";

const dirs = readdirSync(environment.supportPath)

for (const dir of dirs) {
    rmSync(resolve(environment.supportPath, dir), {recursive: true})
}

showToast(ToastStyle.Success, "Cache Cleaned!")
