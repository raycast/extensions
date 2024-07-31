import fs from "fs";
import path from "path";

export function isNonEmptyFile(pathname: string) {
  return fs.existsSync(pathname) && fs.lstatSync(pathname).isFile();
}

export function isPngFile(pathname: string) {
  return path.extname(pathname).toLowerCase() === ".png";
}

export function isNonEmptyDirectory(pathname: string) {
  return fs.existsSync(pathname) && fs.lstatSync(pathname).isDirectory();
}
