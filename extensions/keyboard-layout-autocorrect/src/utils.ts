import { CYR_TO_EN } from "./constants";

export const cyrillicToEn = (text: string) => {
  return text
    .split("")
    .map((c) => CYR_TO_EN[c] || c)
    .join("");
};
