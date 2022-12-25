import { environment } from "@raycast/api";
import { Category } from "./types";
import fs from "fs";

export const categories = require(`${environment.assetsPath}/categories.json`);

export const loadCategory = (category: string): Category => {
  const path = `${environment.assetsPath}/categories/${category}/icons.json`;
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
};

export const getPath = (category: string, name: string): string => {
  return `${environment.assetsPath}/categories/${category}/${name}.svg`;
};

export const getSVG = (path: string): string => {
  return fs.readFileSync(path, { encoding: "utf-8" });
};
