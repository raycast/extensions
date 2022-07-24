import { environment, LocalStorage } from "@raycast/api";
import { downloadPath } from "../components/actions";

export const getStoredOptions = async () => {
  const options: string | undefined = await LocalStorage.getItem("options");
  if (options) {
    return JSON.parse(options);
  } else {
    const color = environment.theme === "light" ? "#000000" : "#ffffff";
    return {
      path: downloadPath,
      color: color,
      size: 256,
      format: "png",
    };
  }
};

export const setStoredOptions = async (options: any) => {
  await LocalStorage.setItem("options", JSON.stringify(options));
};
