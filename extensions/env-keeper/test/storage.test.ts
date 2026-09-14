/**
 * storage 层的回归测试:权限、原子写的临时文件、环境文件扫描、rc 里的那一行、快照。
 *
 * 这些行为都在"会碰到用户真实文件"的路径上,而它们此前只有会话里临时跑的脚本验过,没进仓库。
 * 跑法:`npm test`(vitest),HOME 指向一个临时目录——绝不能碰真实的数据目录和真实项目。
 */
import { existsSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ShellConfig } from "@env-keeper/core";
import { createEmptyShellConfig } from "@env-keeper/core";
import { afterAll, describe, expect, it, vi } from "vitest";

// storage 在模块加载的那一刻就把数据目录算成 $HOME/.env-keeper,所以必须先换掉 HOME 再导入
const home = await mkdtemp(join(tmpdir(), "env-keeper-test-"));
process.env.HOME = home;
const storage = await import("../src/services/storage.js");

afterAll(async () => {
  await rm(home, { recursive: true, force: true });
});

const dataDir = join(home, ".env-keeper");
const modeOf = async (path: string) => (await stat(path)).mode & 0o777;

// 语法检查仅对 zsh / bash 生效(探测不出具体 shell 时按设计跳过校验),换台机器要跟着跳过
const detectedShell = (await storage.detectShellRc()).shellName;
const checkableShell = detectedShell === "zsh" || detectedShell === "bash";

describe("#48 数据目录的权限", () => {
  it("新建的数据目录 0700、里面的配置文件 0600", async () => {
    await storage.ensureStorageDirs();
    await storage.loadRegistry();
    expect(await modeOf(dataDir)).toBe(0o700);
    expect(await modeOf(join(dataDir, "registry.json"))).toBe(0o600);
  });

  it("已经放宽过的文件不会被改回去", async () => {
    const wide = join(home, "wide.json");
    await writeFile(wide, "{}", { mode: 0o644 });
    await storage.writeFileAtomic(wide, "{}");
    expect(await modeOf(wide)).toBe(0o644);
  });
});

describe("#54 原子写的临时文件", () => {
  it("新建的文件只有属主可读写", async () => {
    const file = join(home, "fresh.env");
    await storage.writeFileAtomic(file, "A=1");
    expect(await modeOf(file)).toBe(0o600);
  });

  it("写完不留临时文件", async () => {
    const file = join(home, "clean.env");
    await storage.writeFileAtomic(file, "A=1");
    const names = await readdir(home);
    expect(names.filter((n) => n.includes(".env-keeper-tmp"))).toEqual([]);
  });

  it("临时文件名以 .env 开头,能被 .env* 忽略规则挡住", async () => {
    // 名字是可推导的:目标文件名 + 标记 + 进程号(不带时间戳,崩溃残片下次写会被覆盖)
    const file = join(home, ".env");
    const tmp = join(home, `.env.env-keeper-tmp-${process.pid}`);
    expect(tmp.startsWith(join(home, ".env"))).toBe(true);
    await storage.writeFileAtomic(file, "A=1");
    expect(existsSync(tmp)).toBe(false);
  });

  it("同一目标并发写不会互相踩掉临时文件", async () => {
    const file = join(home, "race.env");
    await Promise.all([
      storage.writeFileAtomic(file, "A=1"),
      storage.writeFileAtomic(file, "A=2"),
      storage.writeFileAtomic(file, "A=3"),
    ]);
    // 排队进行:都成功,最后一个落地
    expect(await readFile(file, "utf8")).toBe("A=3");
  });

  it("目标是软链时写的是它指向的文件,链接本身留着", async () => {
    const real = join(home, "real.env");
    const link = join(home, "link.env");
    await writeFile(real, "A=1");
    await symlink(real, link);

    await storage.writeFileAtomic(link, "A=2");
    // lstat:stat 会跟着软链走,查"链接本身还在不在"必须用 lstat
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readFile(real, "utf8")).toBe("A=2");
  });
});

describe("#56 环境文件扫描", () => {
  const project = async (prefix: string) => mkdtemp(join(home, `proj-${prefix}-`));

  it("只列白名单内的真实文件,临时文件和 .envrc 不算", async () => {
    const dir = await project("plain");
    await writeFile(join(dir, ".env"), "A=1");
    await writeFile(join(dir, ".env.local"), "B=2");
    await writeFile(join(dir, ".envrc"), "use dotenv");
    await writeFile(join(dir, ".env_副本"), "C=3");
    await writeFile(join(dir, ".env.env-keeper-tmp-1"), "D=4");

    expect((await storage.detectProjectEnvFiles(dir)).sort()).toEqual([".env", ".env.local"]);
  });

  it("指向真实文件的软链算一个", async () => {
    const dir = await project("link");
    const elsewhere = await mkdtemp(join(home, "secret-"));
    await writeFile(join(elsewhere, "real.env"), "A=1");
    await symlink(join(elsewhere, "real.env"), join(dir, ".env"));

    expect(await storage.detectProjectEnvFiles(dir)).toEqual([".env"]);
  });

  it("断掉的软链不算", async () => {
    const dir = await project("broken");
    await symlink(join(home, "没有这个文件.env"), join(dir, ".env"));
    expect(await storage.detectProjectEnvFiles(dir)).toEqual([]);
  });

  it("叫 .env 的文件夹不列出来,也不补一个假占位", async () => {
    const dir = await project("dir");
    await mkdir(join(dir, ".env"));
    expect(await storage.detectProjectEnvFiles(dir)).toEqual([]);
  });

  it("真的没有 .env 时补一个占位,方便直接新建", async () => {
    const dir = await project("empty");
    expect(await storage.detectProjectEnvFiles(dir)).toEqual([".env"]);
  });

  it("名字被文件夹占着时说清楚,而不是抛系统错误", async () => {
    const dir = await project("eisdir");
    await mkdir(join(dir, ".env"));

    await expect(storage.readEnvFile(join(dir, ".env"))).rejects.toThrow(/isn't a file/);
    expect(await storage.createEnvFile(dir, ".env")).toEqual({ created: false, notAFile: true });
  });
});

describe("#49 写 shell.sh 前先查语法", () => {
  const configWith = (content: string): ShellConfig => ({
    ...createEmptyShellConfig(),
    snippets: [{ id: "s1", name: "测试片段", type: "snippet", content, enabled: true }],
  });

  it.skipIf(!checkableShell)("语法不通的脚本整份都不写入", async () => {
    await storage.loadShellConfig();
    const before = await readFile(join(dataDir, "shell.json"), "utf8");

    await expect(storage.saveShellConfig(configWith("if true; then"))).rejects.toThrow(/syntax error/);
    // shell.json 一个字都没动(检查放在两次写之前,不会出现 json 更新了、sh 没更新)
    expect(await readFile(join(dataDir, "shell.json"), "utf8")).toBe(before);
  });

  it.skipIf(!checkableShell)("正常脚本写出来是 0600,内容里带片段", async () => {
    await storage.saveShellConfig(configWith("export A=1"));
    const script = join(dataDir, "shell.sh");
    expect(await modeOf(script)).toBe(0o600);
    expect(await readFile(script, "utf8")).toContain("export A=1");
  });

  it.skipIf(!checkableShell)("已经坏着的脚本不拦:不让用户被锁在门外", async () => {
    // 磁盘上本来就是坏的(比如升级前存进去的坏片段),这时再拦就变成"所有片段操作都做不了"
    await writeFile(join(dataDir, "shell.sh"), "if true; then", { mode: 0o600 });
    await expect(storage.saveShellConfig(configWith("if true; then"))).resolves.toBeTruthy();
    expect(await readFile(join(dataDir, "shell.sh"), "utf8")).toContain("if true; then");
  });
});

describe("#53 快照继承源文件权限", () => {
  it("源 .env 是 0600,快照也是 0600", async () => {
    const dir = await mkdtemp(join(home, "proj-snap-"));
    const envPath = join(dir, ".env");
    await writeFile(envPath, "SECRET=old", { mode: 0o600 });

    const result = await storage.writeEnvFileWithSnapshot({
      project: { id: "p_snaptest", name: "snap-test" },
      envFilePath: envPath,
      newContent: "SECRET=new",
    });

    expect(result.success).toBe(true);
    expect(result.snapshotPath).toBeTruthy();
    expect(await modeOf(result.snapshotPath as string)).toBe(0o600);
    expect(await readFile(result.snapshotPath as string, "utf8")).toBe("SECRET=old");
  });

  it("同一秒内连写三次:三份快照都在,没有被互相覆盖", async () => {
    // 快照名只精确到秒,同一秒里的第二次会撞名。这条文档里点名栽过两回
    // (「手动存一份 → 立刻恢复」正好落在同一秒),所以把时间冻住,逼出撞名那条路径
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const dir = await mkdtemp(join(home, "proj-samesec-"));
      const envPath = join(dir, ".env");
      const project = { id: "p_samesec", name: "same-second" };
      await writeFile(envPath, "SECRET=v1", { mode: 0o600 });

      const paths: string[] = [];
      for (const next of ["SECRET=v2", "SECRET=v3", "SECRET=v4"]) {
        const result = await storage.writeEnvFileWithSnapshot({ project, envFilePath: envPath, newContent: next });
        paths.push(result.snapshotPath as string);
      }

      expect(new Set(paths).size).toBe(3);
      // 每一份存的是"写之前那一版",一份都没被后来者盖掉
      expect(await Promise.all(paths.map((p) => readFile(p, "utf8")))).toEqual(["SECRET=v1", "SECRET=v2", "SECRET=v3"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("#49 rc 里那一行", () => {
  it("接入后能移除,rc 其余内容一个字符不动", async () => {
    const rc = join(home, ".zshrc-clean");
    await writeFile(rc, "export PATH=/usr/bin\necho hi\n");

    await storage.appendShellSourceLine(rc, storage.getShellSourceLine());
    expect(await readFile(rc, "utf8")).toContain(".env-keeper/shell.sh");

    const { removed } = await storage.removeShellSourceLine(rc);
    expect(removed).toBe(true);
    const after = await readFile(rc, "utf8");
    expect(after).not.toContain(".env-keeper/shell.sh");
    expect(after).toContain("export PATH=/usr/bin");
    expect(after).toContain("echo hi");
  });

  it("前面有单行 if …; fi 时照样能删(块深度别算错)", async () => {
    const rc = join(home, ".zshrc-oneline-if");
    const prefix = 'if [ -n "$SOME_TOOL" ]; then PATH="$HOME/.tool/bin:$PATH"; fi\ncase ":$PATH:" in *) ;; esac\n';
    await writeFile(rc, prefix);
    await storage.appendShellSourceLine(rc, storage.getShellSourceLine());

    const { removed, customLineFound } = await storage.removeShellSourceLine(rc);
    expect(removed).toBe(true);
    expect(customLineFound).toBeFalsy();
    const after = await readFile(rc, "utf8");
    expect(after).not.toContain(".env-keeper/shell.sh");
    expect(after).not.toContain("Added by Env Keeper");
    expect(after.startsWith(prefix)).toBe(true);
  });

  it("用户自己包在 if 里的写法不删", async () => {
    const rc = join(home, ".zshrc-own");
    const own = `if [ -f "$HOME/.env-keeper/shell.sh" ]; then\n  source "$HOME/.env-keeper/shell.sh"\nfi\n`;
    await writeFile(rc, own);

    const { removed, customLineFound } = await storage.removeShellSourceLine(rc);
    expect(removed).toBe(false);
    expect(customLineFound).toBe(true);
    expect(await readFile(rc, "utf8")).toBe(own);
  });
});
