import { Icon, Color } from "@raycast/api";
import { spaceRole } from "./types";

export const dateIcon = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (diffInDays < 1) {
    return Icon.Clock;
  }
  return Icon.Calendar;
};

export const planLevel = (plan: number) => {
  switch (plan) {
    case 0:
      return { tag: { value: "Free Trial", color: Color.Blue } };
    case 100:
      return { tag: { value: "Community", color: Color.Yellow } };
    case 200:
      return { tag: { value: "Entry", color: Color.Magenta } };
    case 300:
      return { tag: { value: "Business", color: Color.Purple } };
    case 301:
      return { tag: { value: "Development", color: Color.Green } };
    case 400:
      return { tag: { value: "Enterprise", color: Color.Orange } };
    default:
      return { tag: { value: "Unknown", color: Color.Red } };
  }
};

export const formatBytes = (bytes: number): string => {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes == 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
};

export const isStringOnlyNumbers = (input: string): boolean => {
  return /^\d+$/.test(input);
};

export const matchRole = (role: string, roles: spaceRole[]) => {
  if (!isStringOnlyNumbers(role)) {
    return role;
  }

  const foundRole = roles.find((r: spaceRole) => r.id === parseInt(role));
  return foundRole?.role;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
