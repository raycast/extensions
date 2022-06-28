import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const getTopCpuProcess = async (count) => {
  try {
    const output = await execp("/bin/ps -Aceo pcpu,comm -r");
    let processList = output.stdout.trim().split("\n").slice(1, 6);
    processList.forEach((value, index) => {
      processList[index] = value.trim().split(" ");
      processList[index] = [processList[index][0], processList[index].slice(1).join(" ")];
    });
    return processList;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      console.log(execErr.stderr);
      return [];
    } else {
      console.log(`${err}`);
      return [];
    }
  }
};

export { getTopCpuProcess };
