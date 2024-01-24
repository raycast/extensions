/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { default as fs } from "fs";
import { default as path } from "path";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

const preferences: Preferences = getPreferenceValues();
const PATH_PROJECT = preferences.projectDirPaths;
const keyword = (process.argv[3] || "").trim();

function filterIgnore(name: string) {
  return name.indexOf(".") !== 0;
}

function filterSearch(list: any[]) {
  return list.filter((item) => {
    if (!keyword || item.name.indexOf(keyword) > -1) {
      return true;
    }
  });
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

function findWorkspace(parentPath: string, prefix = "") {
  const files = fs.readdirSync(parentPath);
  let wsf = prefix;
  files.find((file: string) => {
    const filePath = path.resolve(parentPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile() && isWorkspace(file)) {
      wsf = path.join(wsf, file);
      return true;
    }
    if (stat.isDirectory() && file === ".configs") {
      // console.warn("----------", filePath, fs.readdirSync(filePath));
      // console.warn("------", wsf, file);
      const subWsf = findWorkspace(filePath, path.join(wsf, file));
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

function readMainProject(parentPath: string) {
  const files = fs.readdirSync(parentPath);
  const availableFiles = files.filter((item: any) => filterIgnore(item));
  const wsFiles = availableFiles
    .map((file: any) => {
      const name = findWorkspace(path.resolve(parentPath, file));
      return name ? `${file}/${name}` : "";
    })
    .filter((item: any) => !!item);
  const includeDeepFiles = parseDeepDirs(parentPath, [...availableFiles, ...wsFiles], (name: string) =>
    ["vuejs"].includes(name),
  );
  return filterSearch(composeJsonItem(parentPath, includeDeepFiles));
}

export function searchProject() {
  const dirList = PATH_PROJECT.split(";");
  const filesList = dirList.map((projectDir) => {
    return readMainProject(projectDir);
  });
  const fileList = filesList.reduce((prev, files) => [...prev, ...files], []);
  const list = keyword ? fileList : [...fileList];
  return { items: list };
}
