import fetch from "node-fetch";
import { LocalStorage } from "@raycast/api";
import { Hue, HueGenerateRecord } from "./types";

export async function getHue() {
  const response = await fetch(
    "https://raw.githubusercontent.com/ridemountainpig/hue/refs/heads/main/public/hue.json",
  );
  const data = await response.json();
  return data;
}

export async function generateHue(colorOne: string, colorTwo: string) {
  const response = await fetch(
    `https://www.hue-palette.com/api/hue-generator?hueColor=${colorOne}-${colorTwo}`,
  );
  const data = await response.json();
  return data;
}

export function generateRandomHexColor(): string {
  const hexChars = "0123456789ABCDEF";
  let color = "#";

  for (let i = 0; i < 6; i++) {
    color += hexChars[Math.floor(Math.random() * 16)];
  }

  return color;
}

export async function addHueGenerateRecord(hue: Hue) {
  const storedRecord = await LocalStorage.getItem("hue-generator-record");
  const hueGeneratorRecord: HueGenerateRecord[] = storedRecord
    ? JSON.parse(storedRecord as string)
    : [];
  const hueRecord = {
    hue: hue as Hue,
    star: false,
    createAt: new Date().toISOString(),
  };
  hueGeneratorRecord.unshift(hueRecord);
  await LocalStorage.setItem(
    "hue-generator-record",
    JSON.stringify(hueGeneratorRecord),
  );
}

export async function getHueGenerateRecord() {
  const storedRecord = await LocalStorage.getItem("hue-generator-record");
  return storedRecord ? JSON.parse(storedRecord as string) : [];
}

export async function updateHueGenerateRecord(
  hueGenerateRecords: HueGenerateRecord[],
) {
  await LocalStorage.setItem(
    "hue-generator-record",
    JSON.stringify(hueGenerateRecords),
  );
}
