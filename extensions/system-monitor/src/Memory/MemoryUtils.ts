import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const getTopRamProcess = async (): Promise<string[][]> => {
  try {
    const output = await execp("/usr/bin/top -l 1 -o mem -n 5 -stats command,mem");
    const processList = output.stdout.trim().split("\n").slice(12, 17);
    const modProcessList: string[][] = [];
    processList.forEach((value) => {
      let temp: string[] = value.trim().split(" ");
      temp = [temp.slice(0, -1).join(" "), temp[temp.length - 1].slice(0, -1) + " MB"];
      modProcessList.push(temp);
    });
    return modProcessList;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getFreeDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Free | sed -n 2p | awk '{print $2 " " $3}'`
    );
    const freeDiskSpace = output.stdout.trim();
    return freeDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};
const getTotalDiskSpace = async (): Promise<string> => {
  try {
    const output = await execp(
      `/usr/sbin/system_profiler SPStorageDataType | grep Capacity | sed -n 2p | awk '{print $2 " " $3}'`
    );
    const totalDiskSpace = output.stdout.trim();
    return totalDiskSpace;
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

export { getTopRamProcess, getFreeDiskSpace, getTotalDiskSpace };
