import { exec } from "child_process";
import { promisify } from "util";

export const formatBytes = (bytes: number): string => {
  const decimals = 2;

  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const dm: number = decimals < 0 ? 0 : decimals;
  const sizes: string[] = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i: number = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const isObjectEmpty = (obj: object): boolean => {
  for (const property in obj) {
    return false;
  }

  return true;
};

export const execp = async (command: string): Promise<string> => {
  const execp = promisify(exec);
  const output = await execp(command);

  return output.stdout.trim();
};

export const convertMsToTime = (milliseconds: number): string => {
  const padTo2Digits = (num: number): string => {
    return num.toString().padStart(2, "0");
  };
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
};

export const convertMinutesToHours = (minutes: number): string => {
  return `${`0${(minutes / 60) ^ 0}`.slice(-2)}:${`0${minutes % 60}`.slice(-2)}`;
};
