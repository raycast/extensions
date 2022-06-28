import { exec } from "child_process";
import { promisify } from "util";
import { ExecError } from "../Interfaces";

const execp = promisify(exec);

const isValidTime = (value) => {
  console.log(value);
  const regexp = /^([0-9]?[0-9]):([0-5]?[0-9])$/;
  if (regexp.test(value)) {
    return true;
  }
  return false;
};

const getCycleCount = async () => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Cycle Count' | awk '{print $3}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};

const getIsCharging = async () => {
  try {
    const output = await execp(
      "/usr/sbin/system_profiler SPPowerDataType | grep 'Charging' | sed -n 2p | awk '{print $2}'"
    );
    return output.stdout.trim() === "Yes";
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};
const getBatteryLevel = async () => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'State of Charge' | awk '{print $5}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};
const getBatteryCondition = async () => {
  try {
    const output = await execp("/usr/sbin/system_profiler SPPowerDataType | grep 'Condition' | awk '{print $2}'");
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};

const getMaxBatteryCapacity = async () => {
  try {
    const output = await execp(
      "/usr/sbin/system_profiler SPPowerDataType | grep 'Maximum Capacity' | awk '{print $3}'"
    );
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
};

const getBatteryTime = async () => {
  try {
    const output = await execp("/usr/bin/pmset -g ps | sed -n 2p | awk '{print $5}'");
    console.log(output.stdout);
    return output.stdout.trim();
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
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
