import { execp } from "../utils";

const UNITS = {
  year: 24 * 60 * 60 * 365,
  month: (24 * 60 * 60 * 365) / 12,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 0,
};

export const getTopCpuProcess = async (count: number): Promise<string[][]> => {
  const output = await execp("/bin/ps -Aceo pcpu,comm -r");
  const processList: string[] = output
    .trim()
    .split("\n")
    .slice(1, count + 1);
  const modProcessList: string[][] = [];

  processList.forEach((value) => {
    let temp: string[] = value.trim().split(" ");
    temp = [temp[0], temp.slice(1).join(" ")];

    modProcessList.push(temp);
  });

  return modProcessList;
};

export const getRelativeTime = (uptime: number): string => {
  const rtf = new Intl.RelativeTimeFormat("en");

  for (const unit in UNITS) {
    const seconds = UNITS[unit as keyof typeof UNITS];

    if (uptime > seconds || unit == "second") {
      return rtf.format(-Math.round(uptime / seconds), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "Unknown";
};
