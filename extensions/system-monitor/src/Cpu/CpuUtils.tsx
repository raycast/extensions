import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

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

export { getTopCpuProcess };
