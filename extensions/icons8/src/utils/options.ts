import { environment, LocalStorage } from "@raycast/api";
import { homedir } from "os";

export const getStoredOptions = async () => {
  const options: string | undefined = await LocalStorage.getItem("options");
  if (options && options !== "null") {
    return JSON.parse(options);
  } else {
    const color = environment.theme === "light" ? "#000000" : "#ffffff";
    return {
      path: `${homedir()}/Downloads`,
      color: color,
      size: 256,
      format: "png",
    };
  }
};

export const setStoredOptions = async (options: any) => {
  await LocalStorage.setItem("options", JSON.stringify(options));
};
