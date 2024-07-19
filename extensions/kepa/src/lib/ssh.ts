import { SSHHostConfig } from "../types/ssh";

const parseSSHConfig = (configText: string): SSHHostConfig[] => {
  const lines = configText.split("\n").map((line) => line.trim());
  const hosts: SSHHostConfig[] = [];
  let currentHost: Partial<SSHHostConfig> = {};

  for (const line of lines) {
    if (line.startsWith("Host ")) {
      if (currentHost.name) hosts.push(currentHost as SSHHostConfig);
      currentHost = { name: line.split(" ")[1] };
    } else if (line && currentHost.name) {
      const [key, value] = line.split(/\s+/);
      currentHost[key] = key === "Port" ? String(parseInt(value, 10)) : value;
    }
  }

  if (currentHost.name) hosts.push(currentHost as SSHHostConfig);

  return hosts;
};

export { parseSSHConfig };
