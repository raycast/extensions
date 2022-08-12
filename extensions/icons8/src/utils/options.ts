import { environment, LocalStorage } from "@raycast/api";
import { Options } from "../types/types";
import { homedir } from "os";

export const getStoredOptions = async (): Promise<Options> => {
  const options: string | undefined = await LocalStorage.getItem("options");
  if (options) {
    return JSON.parse(options);
  } else {
    const color = environment.theme === "light" ? "#000000" : "#ffffff";
    return {
      path: `${homedir()}/Downloads`,
      color: color,
      bgcolor: null,
      padding: 0,
      size: 256,
      format: "png",
    };
  }
};

export const setStoredOptions = async (options: Options) => {
  await LocalStorage.setItem("options", JSON.stringify(options));
};
