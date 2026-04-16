export interface DevServer {
  pid: number;
  port: string;
  url: string; // http://localhost:PORT
  tool: string; // vite | next | webpack | etc.
  runtime: "node" | "bun"; // the actual listening process's runtime
  cwd: string; // /Users/tav/Dev/MyProject
  projectName: string; // MyProject
  startedAt: Date;
}
