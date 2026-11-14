// What the listening process actually is. "other" is a compiled or unknown
// executable that still matched a known dev-server shape (hugo, caddy, …).
export type Runtime =
  | "node"
  | "bun"
  | "deno"
  | "python"
  | "ruby"
  | "php"
  | "go"
  | "rust"
  | "dotnet"
  | "other";

export interface DevServer {
  pid: number;
  port: string;
  url: string; // primary URL: first customUrl when present, else http://localhost:PORT
  localUrl: string; // always http://localhost:PORT, for actions that must target loopback
  customUrls?: string[]; // custom domains pointing at this port (e.g. https://myapp.localhost)
  tool: string; // vite | next | webpack | http.server | rails | etc.
  runtime: Runtime; // the actual listening process's runtime
  command?: string; // command line a restart replays when there is no package.json script; absent when the process rewrote its title and nothing above it is replayable
  workerPids: number[]; // same-port descendants folded into this row (uvicorn --reload, gunicorn/puma workers); killed along with it
  cwd: string; // /Users/tav/Dev/MyProject (the worktree directory)
  projectKey: string; // stable id for grouping; cwd, or git common-dir (the .git path) for repos
  projectName: string; // MyProject (display label for the project section)
  branch?: string; // current git branch when cwd is inside any git repo
  lanExposed: boolean; // true when a listening socket is bound beyond loopback
  startedAt: Date;
}
