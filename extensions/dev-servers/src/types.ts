export interface DevServer {
  pid: number;
  port: string;
  url: string; // primary URL: first customUrl when present, else http://localhost:PORT
  localUrl: string; // always http://localhost:PORT, for actions that must target loopback
  customUrls?: string[]; // custom domains pointing at this port (e.g. https://myapp.localhost)
  tool: string; // vite | next | webpack | etc.
  runtime: "node" | "bun"; // the actual listening process's runtime
  cwd: string; // /Users/tav/Dev/MyProject (the worktree directory)
  projectKey: string; // stable id for grouping; cwd, or git common-dir (the .git path) for repos
  projectName: string; // MyProject (display label for the project section)
  branch?: string; // current git branch when cwd is inside any git repo
  lanExposed: boolean; // true when a listening socket is bound beyond loopback
  startedAt: Date;
}
