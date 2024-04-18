import { execp } from "../utils";

export const getNetworkData = async (): Promise<{ [key: string]: number[] }> => {
  const nettopOptions = [
    "time",
    "interface",
    "state",
    "rx_dupe",
    "rx_ooo",
    "re-tx",
    "rtt_avg",
    "rcvsize",
    "tx_win",
    "tc_class",
    "tc_mgt",
    "cc_algo",
    "P",
    "C",
    "R",
    "W",
    "arch",
  ];
  const output = await execp(`/usr/bin/nettop -P -L 1 -k ${nettopOptions.join()}`);
  const processList: string[] = output.split("\n").slice(1);
  const modProcessList: string[][] = [];
  const processDict: { [key: string]: number[] } = {};

  processList.forEach((value, index) => {
    const temp = processList[index].split(",").slice(0, -1);
    temp[0] = temp[0].split(".")[0];

    modProcessList.push(temp);
  });
  modProcessList.forEach((value) => {
    const tempStringArr: string[] = value.slice(1);
    const tempIntArr: number[] = [];

    tempStringArr.map((val) => {
      tempIntArr.push(parseInt(val, 10));
    });

    processDict[value[0]] = tempIntArr;
  });

  return processDict;
};
