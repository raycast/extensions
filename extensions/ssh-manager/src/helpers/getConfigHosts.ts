import fs from "node:fs/promises";
import SSHConfig, { LineType, Section, Directive } from "ssh-config";
import { glob } from "glob";
import path from "path";
import { type ISSHConnection } from "../types";

type SSHConnectionProperty = keyof ISSHConnection;
type SupportedKey = "Host" | "IdentityFile" | "HostName" | "User" | "Port" | "RemoteCommand";

const configToConnectionOptionMap: Record<SSHConnectionProperty, SupportedKey | readonly SupportedKey[] | null> = {
  id: "Host",
  name: "Host",
  sshKey: "IdentityFile",
  address: ["HostName", "Host"],
  user: "User",
  port: "Port",
  command: "RemoteCommand",
  subtitle: null,
} as const;

type HostInfo = Partial<Record<"Source" | SupportedKey, string>>;

export type HostList = Record<string, HostInfo>;

async function parseConfigFile(p: string): Promise<HostList> {
  try {
    const fullPath = path.resolve(process.cwd(), p);
    try {
      const fileStats = await fs.stat(fullPath);
      if (!fileStats.isFile()) {
        throw new Error("Not a file");
      }
    } catch (err) {
      console.error(`${fullPath} is not a file`);
      return {};
    }

    const text = await fs.readFile(fullPath, "utf8");
    const config = SSHConfig.parse(text);
    const hosts = extractHostsFromConfig(config, fullPath);
    const includes = await extractIncludesFromConfig(config);

    const hostsFromIncludes = await Promise.all(includes.map(async (include) => await parseConfigFile(include)));

    return hostsFromIncludes.reduce(
      (agg, includeHosts) => ({
        ...agg,
        ...includeHosts,
      }),
      hosts
    );
  } catch (e) {
    return {};
  }
}

function isSupportedKey(s: string): s is SupportedKey {
  if (
    Object.values(configToConnectionOptionMap)
      .flat()
      .includes(s as SupportedKey)
  ) {
    return true;
  }
  return false;
}

function getHostInfoFromHost(hostConfig: SSHConfig, host: string, source: string): HostInfo {
  const info: HostInfo = {
    Source: source,
    Host: host,
  };
  (Array.from(hostConfig) as Directive[])
    .filter((line) => line.type === LineType.DIRECTIVE && isSupportedKey(line.param) && typeof line.value === "string")
    .forEach((line) => {
      info[line.param as SupportedKey] = line.value as string;
    });

  return info;
}

function extractHostsFromConfig(config: SSHConfig, definedInPath: string) {
  // Find all Hosts that does not contain wildcards
  const hostDirectives: Section[] = Array.from(config)
    .filter((l) => l.type === LineType.DIRECTIVE && l.param === "Host" && l.value.indexOf("*") === -1)
    .filter((l) => typeof (l as Section).value === "string") as Section[];

  return hostDirectives.reduce<HostList>(
    (prev, { value: hostKey, config }) => ({
      ...prev,
      [hostKey as string]: getHostInfoFromHost(config, hostKey as string, definedInPath),
    }),
    {}
  );
}

async function extractIncludesFromConfig(config: SSHConfig): Promise<string[]> {
  const globPromises = (Array.from(config) as Directive[])
    .filter((l) => l.type === SSHConfig.DIRECTIVE && l.param === "Match")
    .flatMap((match) =>
      (Array.from((match as Section).config) as Section[])
        .filter((item) => item.type === SSHConfig.DIRECTIVE && item.param === "Include")
        .filter((item) => typeof item.value === "string")
        .flatMap((include) => glob(include.value))
    )
    .filter(Boolean);

  return (await Promise.all(globPromises)).flat();
}

export function configToConnection(info: HostInfo, host: string): ISSHConnection {
  const config = (Object.keys(configToConnectionOptionMap) as SSHConnectionProperty[]).reduce(
    (agg, key) => {
      if (key && configToConnectionOptionMap[key] === null) {
        return agg;
      }
      const infoKey = configToConnectionOptionMap[key] as SupportedKey | SupportedKey[];
      if (Array.isArray(infoKey)) {
        const selectedInfoKey = infoKey.find((k) => info[k]);
        if (selectedInfoKey) {
          agg[key] = info[selectedInfoKey] as string;
        }
      } else if (infoKey && info[infoKey]) {
        agg[key] = info[infoKey] as string;
      }
      return agg;
    },
    {
      id: host,
      name: host,
    } as ISSHConnection
  );
  return config;
}

export default async function getConfigHosts(config_path?: string): Promise<HostList> {
  if (!config_path) {
    config_path = `${process.env.HOME}/.ssh/config`;
  }

  return parseConfigFile(config_path) || {};
}
