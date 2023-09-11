import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const UNITS = {
  year: 24 * 60 * 60 * 365,
  month: (24 * 60 * 60 * 365) / 12,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 0,
};

const getTopCpuProcess = async (count: number): Promise<string[][]> => {
  try {
    const output = await execp("/bin/ps -Aceo pcpu,comm -r");
    const processList: string[] = output.stdout
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
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getRelativeTime = (uptime: number): string => {
  const rtf = new Intl.RelativeTimeFormat("en");

  for (const unit in UNITS) {
    const seconds = UNITS[unit as keyof typeof UNITS];

    if (uptime > seconds || unit == "second") {
      return rtf.format(-Math.round(uptime / seconds), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "Unknown";
};

export { getTopCpuProcess, getRelativeTime };
