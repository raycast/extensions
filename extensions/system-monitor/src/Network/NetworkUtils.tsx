import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const getNetworkData = async () => {
  try {
    const output = await execp(
      "nettop -P -L 1 -k time,interface,state,rx_dupe,rx_ooo,re-tx,rtt_avg,rcvsize,tx_win,tc_class,tc_mgt,cc_algo,P,C,R,W,arch"
    );
    let processList = output.stdout.trim().split("\n").slice(1);
    let processDict = {};
    processList.forEach((value, index) => {
      processList[index] = processList[index].split(",").slice(0, -1);
      processList[index][0] = processList[index][0].split(".")[0];
    });
    processList.forEach((value) => {
      let temp = value.slice(1);
      temp.map((val, index) => {
        temp[index] = parseInt(val, 10);
      });
      processDict[value[0]] = temp;
    });
    return processDict;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};
export { getNetworkData };
