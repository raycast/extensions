import { Action, ActionPanel, Detail, environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";
import { useEffect, useState } from "react";
import { readIndex, indexFilePath } from "./lib/index-store";
import {
  commandTracingEnabled,
  readCommandTrace,
  summarizeCommandTrace,
} from "./lib/command-trace";

const run = promisify(execFile);

type Diagnostics = {
  markdown: string;
  copyText: string;
};

function errorCode(error: unknown): string {
  // 错误消息中可能携带真实用户路径，诊断报告只保留错误码。
  const err = error as NodeJS.ErrnoException;
  return typeof err?.code === "string" ? err.code : "UNKNOWN";
}

async function getMacOSVersion(): Promise<string> {
  try {
    const { stdout } = await run("/usr/bin/sw_vers", ["-productVersion"], {
      timeout: 3000,
    });
    return stdout.trim() || "unavailable";
  } catch {
    return `unavailable (Darwin ${os.release()})`;
  }
}

async function collectDiagnostics(): Promise<Diagnostics> {
  const root = environment.supportPath;
  const report: string[] = [
    "## PathSeek 诊断信息（已隐藏绝对路径）",
    "",
    `- macOS: ${await getMacOSVersion()}`,
    `- CPU architecture: ${os.arch()}`,
    `- Raycast: ${environment.raycastVersion}`,
    `- Node.js (Raycast runtime): ${process.version}`,
    `- Development extension: ${environment.isDevelopment ? "yes" : "no"}`,
    `- Extension: ${environment.extensionName}`,
    "",
    "## 持久化索引",
  ];

  let metadataStatus = "unknown";
  let activeStatus = "unknown";
  let indexBytes = "unknown";
  let declaredCount = "unknown";
  let generationCount = "unknown";
  let createdAt = "unknown";
  let rootCount = "unknown";

  try {
    const entries = await readdir(root);
    generationCount = String(
      entries.filter(
        (name) => name === "index.nul" || /^index-[a-f0-9-]+\.nul$/.test(name),
      ).length,
    );
  } catch (error) {
    generationCount = `unavailable (${errorCode(error)})`;
  }

  try {
    const metadata = await readIndex();
    if (!metadata) {
      metadataStatus = "not built";
      activeStatus = "not checked";
    } else {
      metadataStatus =
        metadata.version === 2 ? "v2 embedded header" : "v1 legacy index.json";
      declaredCount = String(metadata.count);
      rootCount = String(metadata.roots.length);
      createdAt = metadata.createdAt;
      const info = await stat(indexFilePath(metadata));
      activeStatus = info.isFile() ? "present" : "not a regular file";
      indexBytes = String(info.size);
    }
  } catch (error) {
    metadataStatus = "invalid or inaccessible";
    activeStatus = "missing/unavailable (" + errorCode(error) + ")";
  }

  report.push(
    `- index format/metadata: ${metadataStatus}`,
    `- active index file: ${activeStatus}`,
    `- active index size (bytes): ${indexBytes}`,
    `- metadata path count: ${declaredCount}`,
    `- root directories count: ${rootCount}`,
    `- last rebuild: ${createdAt}`,
    `- index generation files: ${generationCount}`,
    "",
    "> 此报告不包含用户名、绝对路径、搜索词或文件名，可粘贴到公开 Issue。",
    "> 终端 `node --version` 显示的是系统 Node.js 版本，可能不同于 Raycast 内部 Node.js。",
  );

  report.push("", "## fd/fzf 调用记录（开发者选项）");
  if (commandTracingEnabled()) {
    const records = await readCommandTrace();
    report.push(
      "Tracing: enabled (local, sanitized, maximum 256 KiB per file)",
      "Method: Node.js child_process.spawn, no shell",
      summarizeCommandTrace(records),
      "",
      "> 正常查询不会启动 fd。**只有用户主动执行 Build Index 才调用 fd；不存在定时或打开搜索时自动建索引。**",
      "> 记录中的 started 表示已尝试调用；若无对应结束事件，可能被取消、终止或仍在运行。",
    );
  } else {
    report.push(
      "Tracing: disabled (default). No fd/fzf trace file is written during normal searches.",
    );
  }

  const copyText = report.join("\n");
  return { markdown: copyText, copyText };
}

export default function DebugInfo() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string>();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    collectDiagnostics()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(`Failed to collect diagnostics (${errorCode(failure)})`);
      });
    return () => {
      active = false;
    };
  }, [refreshCount]);

  return (
    <Detail
      isLoading={!data && !error}
      markdown={
        data?.markdown ||
        `# Debug Info\n\n${error || "Collecting system and index status…"}`
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Sanitized Debug Info"
              content={data.copyText}
            />
            <Action
              title="Refresh Diagnostics"
              onAction={() => setRefreshCount((count) => count + 1)}
            />
            <Action.Open
              title="Open PathSeek GitHub Issue"
              target="https://github.com/juezhong/raycast-pathseek/issues/1"
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
