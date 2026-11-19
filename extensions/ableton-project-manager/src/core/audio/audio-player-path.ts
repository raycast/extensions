import { environment } from "@raycast/api";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BINARY_NAME = "audio-player";

let cachedPlayerPath: string | null = null;

/**
 * 把随扩展打包的播放器二进制准备到可写、可执行的位置，并返回其路径。
 *
 * assets 目录在安装后是只读的，且从商店下载的文件可能带有隔离标记，
 * 直接运行会被 macOS 拦截。这里复制到可写的 supportPath，补上执行权限并清除隔离标记。
 *
 * 本函数不会抛出：准备失败时退回源路径，让后续启动失败由现有的错误处理提示用户。
 */
export function ensureAudioPlayerBinary(): string {
  if (cachedPlayerPath) {
    return cachedPlayerPath;
  }

  const source = path.join(environment.assetsPath, BINARY_NAME);
  const target = path.join(environment.supportPath, BINARY_NAME);

  try {
    const sourceStats = fs.statSync(source);
    const targetStats = fs.existsSync(target) ? fs.statSync(target) : null;

    // 仅在目标缺失，或源二进制更新（修改时间更新 / 大小不同）时才复制，避免每次启动都复制。
    const needsCopy =
      !targetStats || targetStats.mtimeMs < sourceStats.mtimeMs || targetStats.size !== sourceStats.size;

    if (needsCopy) {
      fs.mkdirSync(environment.supportPath, { recursive: true });
      // 先写临时文件再原子改名：原地覆盖可执行文件时，macOS 可能因代码签名缓存对不上而杀掉之后启动的进程。
      // rename 换上的是新 inode，正在后台播放的旧进程也不受影响。
      const temp = `${target}.tmp-${process.pid}`;
      try {
        fs.copyFileSync(source, temp);
        fs.chmodSync(temp, 0o755);

        // 清除隔离标记。属性不存在时 xattr 会报错，属正常情况，忽略即可。
        try {
          execFileSync("/usr/bin/xattr", ["-d", "com.apple.quarantine", temp]);
        } catch {
          // 没有隔离标记时无需处理。
        }

        fs.renameSync(temp, target);
      } catch (error) {
        fs.rmSync(temp, { force: true });
        throw error;
      }
    }

    cachedPlayerPath = target;
    return target;
  } catch (error) {
    console.error("[Ableton Project Manager] Failed to prepare audio player binary:", error);
    return source;
  }
}
