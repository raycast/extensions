import type { Agent } from "../../src/lib/agents/model.ts";
import type { Process } from "../../src/lib/platform/model.ts";

export const proc = (pid: number, ppid: number, tty = "", name = "zsh", extra: Partial<Process> = {}): Process => ({
  pid,
  ppid,
  tty,
  name,
  startedAt: 0,
  cwd: "",
  ...extra,
});

export const agent = (key: string, extra: Partial<Agent> = {}): Agent => ({
  key,
  source: "test",
  product: "Test",
  id: key,
  title: key,
  status: "idle",
  host: { kind: "process", pid: 1, tty: "" },
  ...extra,
});
