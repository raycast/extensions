import { execFile } from "node:child_process";

/* 宿主启动的 Node 常继承空 locale。此时 BSD `ps` 会对进程名/路径里的非 ASCII 字节做 vis(3)
   转义，把「企业微信」字面输出成 `M-dM-<M^A…`。强制 UTF-8 locale 让 ps 原样透传字节。
   mac 上 en_US.UTF-8 一定存在。 */
const ENV = { ...process.env, LC_ALL: "en_US.UTF-8", LANG: "en_US.UTF-8" };

/** 数组参数跑外部命令，只取 stdout。禁止拼 shell 字符串。 */
export function run(command: string, args: string[], timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        env: ENV,
        timeout: timeoutMs,
        maxBuffer: 32 * 1024 * 1024,
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
  });
}
