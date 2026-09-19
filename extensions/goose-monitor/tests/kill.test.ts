import { describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { groupProcesses } from "../src/lib/group";
import { killProcess } from "../src/lib/kill";
import { listProcesses } from "../src/lib/list-processes";
import type { AppRow, RawProc } from "../src/lib/types";

const MY_UID = process.getuid?.() ?? 501;
const MIB = 1024 * 1024;

const foo = (pid: number, ppid = 1): RawProc => ({
  pid,
  ppid,
  cpu: 0,
  memBytes: MIB,
  startedAt: "Fri Sep 11 16:01:15 2026",
  uid: MY_UID,
  exe: "/Applications/Foo.app/Contents/MacOS/Foo",
  name: "Foo",
  commandLine: "",
});

const enumerateOf = (procs: RawProc[]) => async (): Promise<RawProc[]> => procs;

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitGone = async (pid: number): Promise<boolean> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!alive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
};

describe("killProcess 校验", () => {
  test("snapshotToken 变化（PID 复用/组变化）→ 拒绝且不杀", async () => {
    const row = groupProcesses([foo(100)])[0];
    const result = await killProcess(row, { enumerate: enumerateOf([foo(200)]) });
    expect(result.ok).toBe(false);
    expect(result.killed).toEqual([]);
    expect(result.error).toContain("Target process changed");
  });

  test("protected 行 → 拒绝，且根本不枚举进程", async () => {
    const protectedRow: AppRow = { ...groupProcesses([foo(100)])[0], protected: true };
    const result = await killProcess(protectedRow, {
      enumerate: () => { throw new Error("Protected row should not enumerate"); },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Protected process");
  });

  test("enumerate 抛错 → ok: false 且不向外抛错", async () => {
    const row = groupProcesses([foo(100)])[0];
    const result = await killProcess(row, {
      enumerate: async () => {
        throw new Error("ps command failed");
      },
    });
    expect(result.ok).toBe(false);
    expect(result.killed).toEqual([]);
    expect(result.error).toContain("ps command failed");
  });

  test("enumerate 返回空列表 → ok: false", async () => {
    const row = groupProcesses([foo(100)])[0];
    const result = await killProcess(row, { enumerate: async () => [] });
    expect(result.ok).toBe(false);
    expect(result.killed).toEqual([]);
    expect(result.error).toContain("Target process changed");
  });

  test("部分 PID 发送信号失败（如 EPERM）→ ok: false", async () => {
    const procs = [foo(100), foo(101, 100)];
    const row = groupProcesses(procs)[0];
    const origKill = process.kill;
    try {
      process.kill = ((pid: number, signal?: string | number) => {
        if (pid === 101 && signal === "SIGTERM") {
          const err = new Error("kill EPERM") as NodeJS.ErrnoException;
          err.code = "EPERM";
          throw err;
        }
        if (signal === 0) throw Object.assign(new Error("kill ESRCH"), { code: "ESRCH" });
        return true;
      }) as typeof process.kill;

      const result = await killProcess(row, { enumerate: enumerateOf(procs) });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("EPERM");
    } finally {
      process.kill = origKill;
    }
  });

  test("传入的 allPids 与当前组无交集 → 拒绝", async () => {
    const procs = [foo(100), foo(101, 100)];
    const row = groupProcesses(procs)[0];
    const result = await killProcess({ ...row, allPids: [999] }, { enumerate: enumerateOf(procs) });
    expect(result.ok).toBe(false);
    expect(result.killed).toEqual([]);
  });

  test("pids 与当前组无交集 → 拒绝", async () => {
    const procs = [foo(100), foo(101, 100)];
    const row = groupProcesses(procs)[0];
    const result = await killProcess(row, { pids: [999], enumerate: enumerateOf(procs) });
    expect(result.ok).toBe(false);
    expect(result.killed).toEqual([]);
  });

  test("组内出现非当前用户的成员 → 组标记 protected", async () => {
    const procs = [foo(100), { ...foo(101, 100), uid: MY_UID + 1 }];
    const row = groupProcesses(procs)[0];
    expect(row.protected).toBe(true);
    expect((await killProcess(row, { enumerate: enumerateOf(procs) })).ok).toBe(false);
  });
});

describe("killProcess 真实进程", () => {
  test("SIGTERM 结束整组 + 子孙，且 ps 采到的中文命令行不乱码", async () => {
    // 复合命令（后台 + wait）避免 sh exec 优化：argv 与中文都留在 ps 里，sleep 是它的子进程。
    let child: ChildProcess | null = spawn("/bin/sh", ["-c", "sleep 30 & wait  # 企业微信"], { stdio: "ignore" });
    const childPid = child.pid!;
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const raw = await listProcesses();
      const sampled = raw.find((proc) => proc.pid === childPid);
      expect(sampled).toBeDefined();
      expect(sampled!.commandLine).toContain("企业微信");

      const descendantPids = raw.filter((proc) => proc.ppid === childPid).map((proc) => proc.pid);
      expect(descendantPids.length).toBeGreaterThan(0);

      const row = groupProcesses(raw).find((candidate) => candidate.allPids.includes(childPid))!;
      expect(row).toBeDefined();
      expect(row.protected).toBe(false);

      const result = await killProcess(row);
      expect(result.ok).toBe(true);
      expect(result.killed).toContain(childPid);
      for (const pid of descendantPids) expect(result.killed).toContain(pid);

      expect(await waitGone(childPid)).toBe(true);
      for (const pid of descendantPids) expect(await waitGone(pid)).toBe(true);
    } finally {
      child?.kill("SIGKILL");
      child = null;
    }
  });

  test("pids 只结束指定成员及其子孙，组里其余进程留着", async () => {
    // 内层 shell 必须用绝对路径调用，exe 才和父 shell 一致（否则各自成组）。
    const child = spawn("/bin/sh", ["-c", "/bin/sh -c 'sleep 30; wait' & /bin/sh -c 'sleep 31; wait' & wait"], {
      stdio: "ignore",
    });
    const childPid = child.pid!;
    let row: AppRow | undefined;
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const raw = await listProcesses();
      const victim = raw.find((proc) => proc.ppid === childPid)!.pid;
      const descendant = raw.find((proc) => proc.ppid === victim)!.pid;
      row = groupProcesses(raw).find((candidate) => candidate.allPids.includes(childPid))!;
      expect(row.allPids).toContain(victim);

      const result = await killProcess(row, { pids: [victim] });
      expect(result.ok).toBe(true);
      expect(result.killed).toEqual(expect.arrayContaining([victim, descendant]));
      expect(result.killed).not.toContain(childPid);

      expect(await waitGone(victim)).toBe(true);
      expect(await waitGone(descendant)).toBe(true);
      expect(alive(childPid)).toBe(true);
    } finally {
      child?.kill("SIGKILL");
      if (row) await killProcess(row).catch(() => undefined); // 没被点名的成员还在，收尾
    }
  });

  test("SIGTERM 后进程仍在（忽略 TERM）→ ok: false 且提示 Try Force Quit", async () => {
    let child: ChildProcess | null = spawn(
      process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
      { stdio: "ignore" },
    );
    const childPid = child.pid!;
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const raw = await listProcesses();
      const row = groupProcesses(raw).find((candidate) => candidate.allPids.includes(childPid));
      expect(row).toBeDefined();

      const termResult = await killProcess(row!, { timeoutMs: 200, pollIntervalMs: 50 });
      expect(termResult.ok).toBe(false);
      expect(termResult.error).toBe("Process did not exit. Try Force Quit.");
      expect(alive(childPid)).toBe(true);

      const killResult = await killProcess(row!, { force: true, timeoutMs: 500, pollIntervalMs: 50 });
      expect(killResult.ok).toBe(true);
      expect(killResult.killed).toContain(childPid);
      expect(await waitGone(childPid)).toBe(true);
    } finally {
      try {
        process.kill(childPid, "SIGKILL");
      } catch {}
      child = null;
    }
  });
});
