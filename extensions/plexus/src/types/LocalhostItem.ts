export type LocalhostItem = {
  id: string;
  projectPath: string;
  framework: string;
  port: string;
  pid: string;
  url: string;
  title?: string;
  favicon?: string;
  source: "host" | "wsl";
  distro?: string;
};
