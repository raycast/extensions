import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { normalizeSyncPath, syncLockPath } from "../../shared/sync-protocol";
import { exportAsSyncJson } from "../../src/lib/data-transfer";
import {
  clearVaultLock,
  lockPathFor,
  normalizePath,
  readVaultFile,
  readVaultLock,
  resolveVaultPath,
  writeVaultFile,
} from "../src/lib/vault-file";

let directory: string;
let target: string;

/** 真实目录（macOS 下 /var 是 /private/var 的符号链接，必须解析后再比较锁名）。 */
function makeRealDir(prefix: string): string {
  return realpathSync.native(mkdtempSync(path.join(tmpdir(), prefix)));
}

beforeEach(() => {
  directory = makeRealDir("goose-2fa-raycast-");
  target = path.join(directory, "sync.json");
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("数据源文件读写（与 uTools 端同一把锁）", () => {
  test("锁名与共享协议一致，且解析到真实文件路径", () => {
    expect(lockPathFor(target)).toBe(`${target}.lock`);
    expect(lockPathFor(target)).toBe(syncLockPath(normalizeSyncPath(target)));
    expect(normalizePath("~/vault.json")).toBe(path.join(homedir(), "vault.json"));
    expect(resolveVaultPath(target)).toBe(target);
  });

  test("符号链接别名解析到同一真实文件与同一把锁", () => {
    writeFileSync(target, "old");
    const alias = path.join(directory, "alias.json");
    symlinkSync(target, alias);

    expect(resolveVaultPath(alias)).toBe(target);
    expect(lockPathFor(alias)).toBe(lockPathFor(target));

    const bridge = path.join(directory, "missing.json");
    expect(resolveVaultPath(bridge)).toBe(bridge);
  });

  test("同一文件经 /var 与 /private/var 访问得到同一把锁", () => {
    if (!target.startsWith("/private/")) return; // 非 macOS 布局下没有这层别名
    const aliasPath = target.replace(/^\/private/, "");
    expect(aliasPath).not.toBe(target);
    expect(lockPathFor(aliasPath)).toBe(lockPathFor(target));
  });

  test("区分缺失、空文件与损坏文件，不把读不到当空库", () => {
    expect(readVaultFile(target).status).toBe("missing");

    writeFileSync(target, "   ");
    expect(readVaultFile(target).status).toBe("empty");

    writeFileSync(target, "{ 不是 JSON");
    expect(readVaultFile(target).status).toBe("invalid");

    writeFileSync(target, JSON.stringify({ app: "other", accounts: [] }));
    expect(readVaultFile(target).status).toBe("invalid");
  });

  test("正常读取返回快照与 stat", () => {
    const content = exportAsSyncJson([], [], []);
    writeFileSync(target, content);
    const read = readVaultFile(target);
    expect(read.status).toBe("ok");
    if (read.status !== "ok") return;
    expect(read.content).toBe(content);
    expect(read.size).toBe(Buffer.byteLength(content));
    expect(read.snapshot.accounts).toEqual([]);
  });

  test("原子写入：0600、不留临时文件与锁文件", async () => {
    const content = exportAsSyncJson([], [], []);
    const result = await writeVaultFile(target, content, null);
    expect(result.status).toBe("ok");
    expect(readFileSync(target, "utf8")).toBe(content);
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(readdirSync(directory)).toEqual(["sync.json"]);
  });

  test("另一个进程持锁时拒绝写入，且绝不按时间抢锁", async () => {
    writeFileSync(target, "old");
    const lockPath = `${target}.lock`;
    writeFileSync(lockPath, "4242\n1700000000000\n");

    const blocked = await writeVaultFile(target, "new", null);
    expect(blocked).toEqual({ status: "locked", lockContent: "4242\n1700000000000\n" });
    expect(readFileSync(target, "utf8")).toBe("old");
    expect(readVaultLock(target)).toBe("4242\n1700000000000\n");

    // 看起来「很久」的锁同样不能被抢占：删掉活锁会让两个写入端同时写同一个文件
    const stale = new Date(Date.now() - 24 * 60 * 60 * 1000);
    utimesSync(lockPath, stale, stale);
    expect((await writeVaultFile(target, "stolen", null)).status).toBe("locked");
    expect(readFileSync(target, "utf8")).toBe("old");
    expect(readVaultLock(target)).not.toBeNull();

    // 只有用户显式清理后才允许写入
    expect(clearVaultLock(target)).toBe(true);
    expect(clearVaultLock(target)).toBe(false);
    expect((await writeVaultFile(target, "after-clear", null)).status).toBe("ok");
    expect(readFileSync(target, "utf8")).toBe("after-clear");
    expect(readdirSync(directory)).toEqual(["sync.json"]);
  });

  test("锁内按 expectedContent 逐字节比对：mtime 相同也不算同一版本", async () => {
    writeFileSync(target, "old");
    const mtime = statSync(target).mtimeMs;
    // 外部改成同长度内容并刻意保留 mtime：stat 看不出来，内容比对必须拦住
    writeFileSync(target, "ext");
    utimesSync(target, new Date(mtime), new Date(mtime));

    expect(await writeVaultFile(target, "new", "old")).toEqual({ status: "conflict" });
    expect(readFileSync(target, "utf8")).toBe("ext");

    expect((await writeVaultFile(target, "new", "ext")).status).toBe("ok");
    expect(readFileSync(target, "utf8")).toBe("new");

    // 基线存在但文件消失：同样算冲突，不能把缺失当空内容
    const gone = path.join(directory, "gone.json");
    expect(await writeVaultFile(gone, "new", "old")).toEqual({ status: "conflict" });
    expect(readdirSync(directory).sort()).toEqual(["sync.json"]);
  });
});
