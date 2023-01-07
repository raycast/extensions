import { environment, Cache } from "@raycast/api";
import { Options } from "../types/types";
import { homedir } from "os";

const cache = new Cache();

export const defaultOptions: Options = {
  path: `${homedir()}/Downloads`,
  color: environment.theme === "light" ? "#000000" : "#ffffff",
  bgcolor: null,
  padding: 0,
  size: 256,
  format: "png",
};

export const getStoredOptions = (): Options => {
  const options: string | undefined = cache.get("options");
  if (options) {
    return JSON.parse(options);
  } else {
    return defaultOptions;
  }
};

export const setStoredOptions = (options: Options) => {
  if (options) {
    cache.set("options", JSON.stringify(options));
  }
};
