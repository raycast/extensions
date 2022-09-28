import util from "util";
import { exec } from "child_process";
import { getCachedEnv } from "./shell-utils";
import { DEFAULT_DNS } from "../config";

export const execCmd = async (cmd: string): Promise<{ error: string | null; data: string }> => {
  const execPromise = util.promisify(exec);
  const env = await getCachedEnv();

  try {
    const { stdout, stderr } = await execPromise(cmd, env);
    return {
      error: stderr,
      data: String(stdout).trim(),
    };
  } catch (err) {
    return { error: (err as Error).message, data: "" };
  }
};

export const getCurrentDevice = async () => {
  // https://github.com/kodango/switchdns/blob/master/src/dns_ops.sh
  const { error, data } = await execCmd(`netstat -rn | awk '/default/{print $NF}' | head -1`);

  if (error) throw new Error(error);
  return data;
};

export const getCurrentNetworkService = async () => {
  const currentDevice = await getCurrentDevice();

  const { error, data } = await execCmd(
    `networksetup -listnetworkserviceorder | grep -B 1 ${currentDevice} | awk -F'\\) ' '{print $2}' | head -1`
  );

  if (error) throw new Error(error);
  return data;
};

export const getCurrentDNS = async () => {
  const networkService = await getCurrentNetworkService();
  if (!networkService) {
    return "";
  }

  // Command return failed when DNS is not set(empty)
  const { error, data } = await execCmd(`networksetup -getdnsservers "${networkService}" | grep -v 'any'`);
  return error ? DEFAULT_DNS.slice(-1)[0].dns : String(data).split("\n").join(",");
};

// dns like: "223.5.5.5,223.6.6.6" | "8.8.8.8"
export const switchDNS = async (dns: string) => {
  const networkService = await getCurrentNetworkService();
  const targetDNS = dns.indexOf(",") > -1 ? dns.split(",").join(" ") : dns;
  const cmd = `networksetup -setdnsservers "${networkService}" ${targetDNS}`;

  console.info(cmd);
  const { error } = await execCmd(cmd);
  return { error, data: dns };
};
