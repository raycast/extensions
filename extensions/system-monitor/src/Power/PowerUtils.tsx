import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const isValidTime = (value: string): boolean => {
  const regexp = /^([0-9]?[0-9]):([0-5]?[0-9])$/;
  if (regexp.test(value)) {
    return true;
  }
  return false;
};

const getCycleCount = async (): Promise<string> => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Cycle Count' | awk '{print $3}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getIsCharging = async (): Promise<boolean> => {
  try {
    const output = await execp(
      "/usr/sbin/system_profiler SPPowerDataType | grep 'Charging' | sed -n 2p | awk '{print $2}'"
    );
    return output.stdout.trim() === "Yes";
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};
const getBatteryLevel = async (): Promise<string> => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'State of Charge' | awk '{print $5}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};
const getBatteryCondition = async (): Promise<string> => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Condition' | awk '{print $2}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getMaxBatteryCapacity = async (): Promise<string> => {
  try {
    const output = await execp(
      "/usr/sbin/system_profiler SPPowerDataType | grep 'Maximum Capacity' | awk '{print $3}'"
    );
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

const getBatteryTime = async (): Promise<string> => {
  try {
    const output = await execp("/usr/bin/pmset -g ps | sed -n 2p | awk '{print $5}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    throw execErr;
  }
};

export {
  getIsCharging,
  getCycleCount,
  getBatteryLevel,
  getBatteryCondition,
  getMaxBatteryCapacity,
  isValidTime,
  getBatteryTime,
};
