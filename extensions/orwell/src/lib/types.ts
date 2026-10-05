export type Framework =
  "next" | "vite" | "nuxt" | "astro" | "remix" | "gatsby" | "webpack-dev-server" | "angular" | "ember" | "unknown";

export interface DevServer {
  pid: number;
  port: number;
  projectName: string;
  projectDir: string;
  command: string;
  framework: Framework;
  faviconPath: string | null;
  url: string;
  status: "online" | "offline";
}

export interface RegistryEntry {
  projectDir: string;
  projectName: string;
  framework: Framework;
  lastPort: number;
  startCommand: string;
  lastSeen: string; // ISO timestamp
}
