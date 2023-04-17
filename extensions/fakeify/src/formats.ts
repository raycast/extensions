import { Icon } from "@raycast/api";
import { PhoneFormat as Format, PhoneFormats as Formats } from "./types";

export const PHONE_FORMATS: Formats = {
  fr: {
    format: [2, 2, 2, 2],
    separator: ".",
    base: ["03.", "09.", "06.", "07."],
  },
  uk: {
    format: [2, 4, 4],
    separator: " ",
    base: ["0"],
  },
  us: {
    format: [3, 3, 4],
    separator: "-",
    base: [""],
  },
};

export const FORMATS_SELECT: { [k: string]: { value: string; label: string }[] } = {
  phone: [
    { value: "us", label: "US" },
    { value: "uk", label: "UK" },
    { value: "fr", label: "FR" },
  ],
  date: [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "MMM Do YYYY", label: "Jan 1st 2023" },
    { value: "ddd Do MMM YYYY", label: "Mon 1st Jan 2023" },
  ],
};

export const DATES: { [k: string]: string } = {
  "DD/MM/YYYY": "DD/MM/YYYY",
  "MM/DD/YYYY": "MM/DD/YYYY",
  "MMM Do YYYY": "Jan 1st 2023",
  "ddd Do MMM YYYY": "Mon 1st Jan 2023",
};

export const EMAIL_PROVIDERS: string[] = ["gmail", "yahoo", "outlook", "gmx", "aol", "yandex", "icloud", "proton"];

export const characters = "abcdefghijklmnopqrstuvwxyz";

export const IdsCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
