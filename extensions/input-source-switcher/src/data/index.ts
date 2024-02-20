import { eng, ukr } from "./lang";

export type Language = keyof typeof languages;

export const languages = {
  eng,
  ukr,
};
