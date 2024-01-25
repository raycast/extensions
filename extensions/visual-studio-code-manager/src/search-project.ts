/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { homedir } from "os";
import { default as fs } from "fs";
import { default as path } from "path";
import fse from "fs-extra";
import { getPreferenceValues } from "@raycast/api";
import { CacheProjectEntity, Preferences, ProjectEntry } from "./types";

const preferences: Preferences = getPreferenceValues();
const PATH_PROJECT = preferences.projectDirPaths;
const keyword = (process.argv[3] || "").trim();

function filterIgnore(name: string) {
  return name.indexOf(".") !== 0;
}

function filterSearch(list: any[]) {
  return list;
  // return list.filter((item) => {
  //   if (!keyword || item.name.indexOf(keyword) > -1) {
  //     return true;
  //   }
  // });
}

function parseDeepDirs(parentPath: string, files: any, checker: any = () => false) {
  return files.reduce((prev: any, item: any) => {
    if (checker(item)) {
      const deeps = fs
        .readdirSync(path.resolve(parentPath, item))
        .filter((name: string) => filterIgnore(name))
        .map((name: string) => `${item}/${name}`);
      return [...prev, item, ...deeps];
    }
    return [...prev, item];
  }, []);
}

function composeJsonItem(path: string, list: any[]) {
  return list.map((item) => {
    return {
      name: item,
      rootPath: `${path}/${item}`,
      enabled: true,
      tags: [],
      arg: "",
    };
  });
}

function readProjects(projPath: any) {
  return fs
    .readdirSync(projPath)
    .filter((name: string) => {
      return fs.statSync(path.resolve(projPath, name)).isDirectory();
    })
    .map((name: string) => `${projPath}/${name}`);
}

// 分析是否存在code-workspace
function isWorkspace(name: string) {
  return name.indexOf(".code-workspace") > -1;
}

async function findWorkspace(parentPath: string, prefix = "") {
  const files = await fse.readdir(parentPath);
  let wsf = prefix;
  files.find(async (file: string) => {
    const filePath = path.resolve(parentPath, file);
    const stat = await fse.stat(filePath);
    if (stat.isFile() && isWorkspace(file)) {
      wsf = path.join(wsf, file);
      return true;
    }
    if (stat.isDirectory() && file === ".configs") {
      const subWsf = await findWorkspace(filePath, path.join(wsf, file));
      // console.warn("------", subWsf);
      if (subWsf) {
        wsf = path.join(wsf, subWsf);
        return true;
      }
      return false;
    }
    return false;
  });
  return wsf;
}

async function readMainProject(parentPath: string) {
  const files = await fse.readdir(parentPath);
  const availableFiles = files.filter((item: any) => filterIgnore(item));
  const wsFiles = await Promise.all(
    availableFiles
      .map(async (file: any) => {
        const name = await findWorkspace(path.resolve(parentPath, file));
        return name ? `${file}/${name}` : "";
      })
      .filter((item: any) => !!item),
  );
  const includeDeepFiles = parseDeepDirs(parentPath, [...availableFiles, ...wsFiles], (name: string) =>
    ["vuejs"].includes(name),
  );
  return filterSearch(composeJsonItem(parentPath, includeDeepFiles));
}

export async function searchProject() {
  const dirList = PATH_PROJECT.split(";");
  const filesList: any[] = await Promise.all(
    dirList.map((projectDir) => {
      return readMainProject(projectDir);
    }),
  );
  const fileList = filesList.reduce((prev, files) => [...prev, ...files], []);
  const list = keyword ? fileList : [...fileList];
  return list;
}

function getDefaultRencentJSON() {
  return { list: [] };
}

const TARGET_DIR = path.resolve(homedir(), ".raycast_extension_vscode_manager/cache_project");

fse.ensureDirSync(TARGET_DIR);

export const ALL_PROJECT_JSON = path.resolve(TARGET_DIR, "all.json");

if (!fse.pathExistsSync(ALL_PROJECT_JSON)) {
  fse.writeJSONSync(ALL_PROJECT_JSON, { list: [] });
}

class AllProject {
  allProjectList: CacheProjectEntity["list"] = [];

  async readAllJSON(): Promise<CacheProjectEntity> {
    try {
      return await fse.readJSON(ALL_PROJECT_JSON);
    } catch (error) {
      console.error(error);
      return getDefaultRencentJSON();
    }
  }

  async updateAllJSON(list: ProjectEntry[]) {
    try {
      await fse.writeJSON(ALL_PROJECT_JSON, {
        list,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async getAllProject(): Promise<CacheProjectEntity> {
    const allProjectData = await this.readAllJSON();
    this.allProjectList = allProjectData.list;
    return allProjectData;
  }

  async getRealTimeAllProject(): Promise<ProjectEntry[]> {
    const projects: any = await searchProject();
    this.allProjectList = projects;
    this.updateAllJSON(this.allProjectList);
    return projects;
  }
}

export const allProject = new AllProject();
