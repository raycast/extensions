import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const getTopCpuProcess = async (count: number): Promise<string[][]> => {
  try {
    const output = await execp("/bin/ps -Aceo pcpu,comm -r");
    let processList: string[] = output.stdout.trim().split("\n").slice(1, 6);
    let modProcessList: string[][] = [];
    processList.forEach((value, index) => {
      let temp: string[] = value.trim().split(" ");
      temp = [temp[0], temp.slice(1).join(" ")];
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

export { getTopCpuProcess };
