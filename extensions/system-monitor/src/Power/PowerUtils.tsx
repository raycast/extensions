import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

export const getCycleCount = async (): Promise<string> => {
  const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Cycle Count' | awk '{print $3}'");

  return output.stdout.trim();
};

export const getIsCharging = async (): Promise<boolean> => {
  const output = await execp(
    "/usr/sbin/system_profiler SPPowerDataType | grep 'Charging' | sed -n 2p | awk '{print $2}'"
  );

  return output.stdout.trim() === "Yes";
};

export const getBatteryLevel = async (): Promise<string> => {
  const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'State of Charge' | awk '{print $5}'");

  return output.stdout.trim();
};
export const getBatteryCondition = async (): Promise<string> => {
  const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Condition' | awk '{print $2}'");

  return output.stdout.trim();
};

export const getMaxBatteryCapacity = async (): Promise<string> => {
  const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Maximum Capacity' | awk '{print $3}'");

  return output.stdout.trim();
};

export const getBatteryTime = async (): Promise<string> => {
  const output = await execp("/usr/bin/pmset -g ps | sed -n 2p | awk '{print $5}'");

  return output.stdout.trim();
};

export const getTimeOnBattery = async (): Promise<string> => {
  const output = await execp('/usr/bin/pmset -g log | grep "Using AC" | tail -n 1 | awk \'{print $1 " " $2 " " $3}\'');
  const lastChargeDate = output.stdout.trim();
  const startTime = new Date(Date.parse(lastChargeDate));
  const endTime = new Date();

  return convertMsToTime(endTime.valueOf() - startTime.valueOf());
};

const padTo2Digits = (num: number) => {
  return num.toString().padStart(2, "0");
};

const convertMsToTime = (milliseconds: number) => {
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
};
