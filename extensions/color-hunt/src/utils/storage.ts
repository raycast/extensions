import { LocalStorage } from "@raycast/api";
import { StorageData } from "../type";

const key = "likesJson";

export async function readIds() {
  const likes = await read();
  return likes.map((like) => like.code);
}

export async function read(): Promise<StorageData[]> {
  try {
    const likesJson = await LocalStorage.getItem<string>(key);
    if (likesJson) {
      console.log(likesJson);
      return JSON.parse(likesJson) as StorageData[];
    }
    return [];
  } catch (error) {
    throw new Error("Failed to read storage file");
  }
}

export async function write(code: string, svg: string) {
  const storageData = await read();
  const data = storageData.filter((item) => item.code !== code);
  data.push({ code, svg });

  await LocalStorage.setItem(key, JSON.stringify(data.sort()));
}

export async function remove(code: string) {
  const storageData = await read();
  const data = storageData.filter((item) => item.code !== code);

  await LocalStorage.setItem(key, JSON.stringify(data.sort()));
}
