import path from "path";
import fs from "node:fs/promises";

export async function getProjects(parentDir: string) {
  const codeDir = (await fs.readdir(parentDir)).filter(isHidden);
  const choices: Array<{ dir: string; fullPath: string }> = [];
  for (const dir of codeDir) {
    let fullPath = dir;
    if (!path.isAbsolute(dir)) {
      fullPath = path.join(parentDir, dir);
    }
    if (fullPath.includes("/node_modules/")) continue;
    if (fullPath.includes("/build/")) continue;
    if (fullPath.includes("/dist/")) continue;
    if (fullPath.includes("/coverage/")) continue;

    const pkgjson = path.join(fullPath, "package.json");
    if (await isFile(pkgjson)) {
      choices.push({
        dir,
        fullPath,
      });
    } else if (await isDirectory(fullPath)) {
      choices.push(...(await getProjects(fullPath)));
    }
  }
  return choices;
}

async function isDirectory(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function isFile(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function isHidden(filePath: string) {
  return !/^\..*/.test(filePath);
}
