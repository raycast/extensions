import { execSync, ExecSyncOptions } from "child_process";
import { getCachedEnv } from "./shell-utils";
import { DEFAULT_DNS } from "../config";
import { getPreferenceValues } from "@raycast/api";

export const execCmd = async (cmd: string, env: ExecSyncOptions) => {
  try {
    const stdout = execSync(cmd, env);
    return {
      data: String(stdout).trim(),
      error: "",
    };
  } catch (err) {
    return {
      data: "",
      error: String(err),
    };
  }
};

const useSudo = getPreferenceValues().sudo ?? false;
const adminPassword = getPreferenceValues().password ?? "";

export const getCurrentDevice = async (env: ExecSyncOptions) => {
  // https://github.com/kodango/switchdns/blob/master/src/dns_ops.sh
  const { error, data } = await execCmd(`/usr/sbin/netstat -rn | awk '/default/{print $NF}' | head -1`, env);

  if (error) throw new Error(error);
  return data.trim();
};

export const getCurrentNetworkService = async (env: ExecSyncOptions) => {
  const currentDevice = await getCurrentDevice(env);

  const { error, data } = await execCmd(
    `/usr/sbin/networksetup -listnetworkserviceorder | grep -B 1 ${currentDevice} | awk -F'\\) ' '{print $2}' | head -1`,
    env
  );

  if (error) throw new Error(error);
  return data.trim();
};

export const getCurrentDNS = async () => {
  const env = await getCachedEnv();
  const networkService = await getCurrentNetworkService(env);
  if (!networkService) {
    return "";
  }

  // Command return failed when DNS is not set(empty)
  const { error, data } = await execCmd(
    `/usr/sbin/networksetup -getdnsservers "${networkService}" | grep -v 'any'`,
    env
  );
  return error ? DEFAULT_DNS.slice(-1)[0].dns : String(data).split("\n").join(",");
};

// dns like: "223.5.5.5,223.6.6.6" | "8.8.8.8"
export const switchDNS = async (dns: string) => {
  const env = await getCachedEnv();
  const networkService = await getCurrentNetworkService(env);
  const targetDNS = dns.indexOf(",") > -1 ? dns.split(",").join(" ") : dns;
  const cmd = `/usr/sbin/networksetup -setdnsservers "${networkService}" ${targetDNS}`;
  const { error } = await execCmd(useSudo ? `echo ${adminPassword} | sudo -S ${cmd}` : cmd, env);
  const errMsg =
    error.toLowerCase().replaceAll("\n", "").indexOf("try again") !== -1
      ? 'Password Incorrect. Check "Admin Password" in Preference'
      : String(error);

  return { error: errMsg || "", data: dns };
};
