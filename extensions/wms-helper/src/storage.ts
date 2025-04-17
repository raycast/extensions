import { LocalStorage } from "@raycast/api";
import { Env } from "./types";

export async function getEnv(): Promise<Env> {
  return (await LocalStorage.getItem<Env>("env")) ?? "boe";
}

export async function getWmsDomain() {
  const env = await getEnv();
  if (env === "boe") {
    return "https://gswms-boe.bytedance.net";
  }

  return "https://gswms.fanchenzhishang.com";
}

export async function getRequestUrl(url: string) {
  return `${await getWmsDomain()}${url}`;
}

export async function getWmsToken() {
  return (await LocalStorage.getItem<string>("wmsToken")) ?? "";
}

export async function setWmsToken(token: string) {
  await LocalStorage.setItem("wmsToken", token);
}

export async function getCurrentWarehouse() {
  return (await LocalStorage.getItem<string>("currentWarehouse")) ?? "";
}

export async function setCurrentWarehouse(warehouse: string) {
  await LocalStorage.setItem("currentWarehouse", warehouse);
}

export async function getHeaders(headers: Record<string, string> = {}) {
  return {
    Cookie: await getWmsToken(),
    ...headers,
  };
}
