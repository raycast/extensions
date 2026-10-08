import { LocalStorage } from "@raycast/api";
import { storageKeys } from "./constants";

export interface CanvasEntry {
  title: string;
  url: string;
  dateCreated: string;
  description: string;
}

export async function getAllCanvasesJson() {
  let data: any;

  try {
    data = JSON.parse((await LocalStorage.getItem(storageKeys.allCavnases)) ?? "");
  } catch {
    data = {};
  }
  return data;
}

export async function getAllCanvases() {
  try {
    const allCanvases = await getAllCanvasesJson();

    const formattedAllCanvases: CanvasEntry[] = [];
    Object.values(allCanvases).forEach((canvas: any) => {
      formattedAllCanvases.push(canvas);
    });
    return formattedAllCanvases;
  } catch {
    return [];
  }
}

export async function saveCanvas(data: CanvasEntry) {
  const allPreviousCanvases = await getAllCanvasesJson();
  await LocalStorage.setItem(
    storageKeys.allCavnases,
    JSON.stringify({ ...allPreviousCanvases, [data["title"]]: data })
  );
}

export async function removeCanvas(canvasTitle: string) {
  const allPreviousCanvases = await getAllCanvasesJson();
  delete allPreviousCanvases[canvasTitle];
  await LocalStorage.setItem(storageKeys.allCavnases, JSON.stringify({ ...allPreviousCanvases }));
}

function separateObject(obj: any) {
  const res: object[] = [];
  const keys = Object.keys(obj);
  keys.forEach((key: string) => {
    res.push({
      [key]: obj[key],
    });
  });
  return res;
}

export function getNewSlashDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // months start at 0
  let dd = today.getDate();

  if (dd < 10) {
    dd = parseInt("0" + dd);
  }
  if (mm < 10) {
    mm = parseInt("0" + mm);
  }

  return `${mm}/${dd}/${yyyy}`;
}

export async function canvasUrlExists(url: string) {
  let alreadyExists = false;
  const allPreviousCanvases = await getAllCanvases();
  for (const canvas of allPreviousCanvases) {
    if (canvas.url == url) {
      alreadyExists = true;
      return alreadyExists;
    } else {
      alreadyExists = false;
    }
  }
  return alreadyExists;
}

export async function canvasTitleExists(title: string) {
  let alreadyExists = false;
  const allPreviousCanvases = await getAllCanvases();
  for (const canvas of allPreviousCanvases) {
    if (canvas.title == title) {
      alreadyExists = true;
      return alreadyExists;
    } else {
      alreadyExists = false;
    }
  }
  return alreadyExists;
}

export async function getCanvasKeys(keysArraySetter: React.Dispatch<string[]>) {
  let data: string[] = [];

  try {
    const jsonData = JSON.parse((await LocalStorage.getItem(storageKeys.allCavnases)) ?? "");
    data = Object.keys(jsonData);
  } catch {
    data = [];
  }

  keysArraySetter(data);
}

export async function getCanvasDescription(key: string) {
  const previous = await getAllCanvasesJson();
  try {
    return previous[key].description;
  } catch {
    return "";
  }
}
