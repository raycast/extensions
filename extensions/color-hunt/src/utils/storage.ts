import { environment, LocalStorage } from "@raycast/api";
import path from "node:path";
import fs from "fs";
import { StorageData } from "../type";
import { promises } from "node:fs";

const file = path.join(environment.supportPath, "likes.json");

export async function readIds() {
  const data = await LocalStorage.getItem<string>("likes");
  return data ? data.split(",") : [];
}

export async function read(): Promise<StorageData[]> {
  try {
    const data = await promises.readFile(file, "utf-8");
    return JSON.parse(data) as unknown as StorageData[];
  } catch (error) {
    throw new Error("Failed to read storage file");
  }
}

export async function write(code: string, svg: string) {
  const storageData = await read();
  const data = storageData.filter((item) => item.code !== code);
  data.push({ code, svg });
  fs.writeFileSync(file, JSON.stringify(data.sort()));

  await LocalStorage.setItem("likes", data.map((item) => item.code).join(","));
}

export async function remove(code: string) {
  const storageData = await read();
  const data = storageData.filter((item) => item.code !== code);
  fs.writeFileSync(file, JSON.stringify(data.sort()));

  await LocalStorage.setItem("likes", data.map((item) => item.code).join(","));
}
