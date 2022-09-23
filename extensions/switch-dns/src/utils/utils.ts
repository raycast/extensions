import { execSync } from "child_process";
import { getCachedEnv } from "./shell-utils";
import { DEFAULT_DNS } from "../config";

export const exec = async (cmd: string) => {
  const env = await getCachedEnv();
  try {
    const output = execSync(cmd, env);
    return String(output).trim();
  } catch (err) {
    console.error(err);
    return "";
  }
};

export const getCurrentDevice = async () => {
  // https://github.com/kodango/switchdns/blob/master/src/dns_ops.sh
  return await exec(`netstat -rn | awk '/default/{print $NF}' | head -1`);
};

export const getCurrentNetworkService = async () => {
  const currentDevice = await getCurrentDevice();

  return await exec(
    `networksetup -listnetworkserviceorder | grep -B 1 ${currentDevice} | awk -F'\\) ' '{print $2}' | head -1`
  );
};

export const getCurrentDNS = async () => {
  const networkService = await getCurrentNetworkService();
  if (!networkService) {
    return "";
  }

  const out = await exec(`networksetup -getdnsservers "${networkService}" | grep -v 'any'`);
  if (!out) {
    return DEFAULT_DNS.slice(-1)[0].dns;
  }
  return out.split("\n").join(",");
};

// dns like: "223.5.5.5,223.6.6.6" | "8.8.8.8"
export const switchDNS = async (dns: string) => {
  const networkService = await getCurrentNetworkService();
  const targetDNS = dns.indexOf(",") > -1 ? dns.split(",").join(" ") : dns;
  const cmd = `networksetup -setdnsservers "${networkService}" ${targetDNS}`;

  console.info(cmd);
  await exec(cmd);
  return dns;
};
