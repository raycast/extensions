import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const getTopRamProcess = async (): Promise<string[][]> => {
  try {
    const output = await execp("/usr/bin/top -l 1 -o mem -n 5 -stats command,mem");
    let processList = output.stdout.trim().split("\n").slice(12, 17);
    let modProcessList: string[][] = [];
    processList.forEach((value) => {
      let temp: string[] = value.trim().split(" ");
      if (temp === undefined) {
        throw new TypeError("undefined value");
      }
      temp = [temp.slice(0, -1).join(" "), temp[temp.length - 1].slice(0, -1) + " MB"];
      modProcessList.push(temp);
    });
    return modProcessList;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      throw execErr.stderr;
    } else {
      throw `${err}`;
    }
  }
};

const getFreeDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Free | sed -n 2p | awk '{print $2 " " $3}'`
    );
    let freeDiskSpace = output.stdout.trim();
    return freeDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      throw execErr.stderr;
    } else {
      throw `${err}`;
    }
  }
};
const getTotalDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Capacity | sed -n 2p | awk '{print $2 " " $3}'`
    );
    let totalDiskSpace = output.stdout.trim();
    return totalDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      throw execErr.stderr;
    } else {
      throw `${err}`;
    }
  }
};

export { getTopRamProcess, getFreeDiskSpace, getTotalDiskSpace };
