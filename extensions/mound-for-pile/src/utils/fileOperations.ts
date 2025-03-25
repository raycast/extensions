import matter = require("gray-matter");
import { join } from "path";
import { writeFile, readFile, mkdir } from "fs/promises";
import { getFilePathForNewPost, getRelativeFilePath } from "../helpers";
import { showToast, LocalStorage } from "@raycast/api";
import { remark } from "remark";
import { homedir } from "os";
import { existsSync } from "fs";
import { PileDataI } from "./types";

class PileOperations {
  public static generateMarkdownFile = (content: string, data: PileDataI) => {
    return matter.stringify(content, data, { engines: { JSON } });
  };

  public static generateJSONFileFromMarkdown = (content: string) => {
    return matter(content);
  };

  public static generateMarkdownFromHTML = async (html: string) => {
    return remark().process(html);
  };

  public static createDirectory = (path: string) => {
    return new Promise((resolve, reject) => {
      mkdir(path, { recursive: true })
        .then(() => {
          resolve("Directory created successfully");
        })
        .catch((error) => {
          if (error.code === "EEXIST") {
            resolve("Directory already exists");
          }
          reject(error);
        });
    });
  };

  public static addFileToIndex = async (path: string, data: PileDataI) => {
    const filePath = join(path, "index.json");
    const fileData = readFile(filePath, "utf-8");
    const tempData = await fileData;
    const parsedData = JSON.parse(tempData.toString());
    const newData = [[getRelativeFilePath(), data], ...parsedData];
    const fileContents = JSON.stringify(newData);
    await writeFile(filePath, fileContents, "utf-8");
  };

  public static readFile = async (path: string) => {
    return new Promise((resolve, reject) => {
      readFile(path, "utf-8")
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  public static saveFile = async (path: string, data: string, isPost: boolean = false) => {
    return new Promise((resolve, reject) => {
      writeFile(isPost ? getFilePathForNewPost(path) : path, data, "utf-8")
        .then(() => {
          resolve("File written successfully");
          showToast({ title: "Created Pile Post", message: "Successfully created Pile Post" });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  public static getLocalStorage = async (key: string) => {
    return await LocalStorage.getItem<string>(key);
  };

  public static setLocalStorage = async (key: string, value: string) => {
    return await LocalStorage.setItem(key, value);
  };

  public static getConfigFilePath = async () => {
    return join(homedir(), "Piles");
  };

  public static getConfigFile = async () => {
    return join(homedir(), "Piles", "piles.json");
  };

  public static verifyConfigFilePath = async () => {
    const filePath = join(homedir(), "Piles", "piles.json");
    const path = join(homedir(), "Piles");
    if (existsSync(filePath)) {
      return true;
    } else {
      await mkdir(path, { recursive: true });
      await writeFile(filePath, JSON.stringify([]), "utf-8")
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    }
  };
}

export default PileOperations;
