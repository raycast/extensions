import * as path from "path";
import fs from "fs";
import { CompileConfig, exec_compile, remove_LocalConfig_watch } from "./util_compile";
import { Icon, confirmAlert } from "@raycast/api";

export function delayOperation(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function truncatePath_disp(filePath: string): string {
  const components = filePath.split(path.sep);
  if (components.length >= 2) {
    return ".../" + path.join(components[components.length - 2], components[components.length - 1]);
  } else {
    // In case there are fewer than two components, return the entire path.
    return filePath;
  }
}

export function checkFile_exist(filePath: string): boolean {
  if (fs.existsSync(filePath)) {
    return true;
  } else {
    return false;
  }
}

export async function alertConfig_delete(config: CompileConfig) {
  if (
    await confirmAlert({
      title: "SCSS File not Found",
      message: "Do you wish to delete this config?",
      icon: Icon.Warning,
    })
  ) {
    return remove_LocalConfig_watch(config);
  } else {
    return;
  }
}

export async function alertConfig_compile(config: CompileConfig) {
  if (
    await confirmAlert({ title: "CSS File not Found", message: "Do you wish to compile first?", icon: Icon.Warning })
  ) {
    return exec_compile(config);
  } else {
    return;
  }
}
