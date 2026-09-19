import { promises as fs } from "node:fs";
import path from "node:path";

export const EXAMPLE_YAML = `machines:
  dev:
    ip: 192.168.1.20
    proxmox:
      value: 192.168.1.46
      user: root
      ssh: \${user}@\${value}
      open: https://\${value}:8006
      obsidian: My Vault/Machines/Proxmox
projects:
  home:
    location:
      value: ~
      open: \${value}
      application/Terminal: \${value}
`;

export async function createExampleFile(directory: string): Promise<string> {
  const file = path.join(directory, "quick-groups-example.yaml");
  await fs.writeFile(file, EXAMPLE_YAML, { encoding: "utf8", flag: "wx" });
  return file;
}
