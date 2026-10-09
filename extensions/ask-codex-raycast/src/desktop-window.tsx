import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  popToRoot,
  type LaunchProps,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import {
  LEGACY_KEY,
  LIBRARY_KEY,
  messageOf,
  parseLibrary,
  type StoredConversation,
} from "./conversations";
import type { ModelSelection } from "./codex";
import { MODEL_SELECTION_KEY } from "./model-menu";

export async function openDesktopWindow(options: {
  preferences: Preferences;
  conversation?: StoredConversation;
  selection?: ModelSelection | null;
  prompt?: string;
  beforeOpen?: () => void;
}) {
  if (process.platform !== "darwin")
    throw new Error(
      "独立窗口目前为 macOS 试用版。请在插件设置中选择 Raycast 内聊天。",
    );
  const appPath = join(homedir(), "Applications", "Ask ChatGPT.app");
  try {
    await access(appPath);
  } catch {
    throw new Error(
      "没有找到 Ask ChatGPT 独立窗口。请安装试用窗口，或在插件设置中选择 Raycast 内聊天。",
    );
  }
  await mkdir(environment.supportPath, { recursive: true });
  const handoff = join(
    environment.supportPath,
    `window-handoff-${randomUUID()}.json`,
  );
  await writeFile(handoff, JSON.stringify(options), { mode: 0o600 });
  options.beforeOpen?.();
  await popToRoot();
  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        "/usr/bin/open",
        ["-n", "-a", appPath, "--args", "--handoff", handoff],
        (reason) => (reason ? reject(reason) : resolve()),
      ),
    );
  } catch (reason) {
    await unlink(handoff).catch(() => undefined);
    throw reason;
  }
  await closeMainWindow();
}

export async function returnFromDesktopWindow(): Promise<{
  conversation?: StoredConversation;
  selection?: ModelSelection | null;
}> {
  if (process.platform !== "darwin") return {};
  const dataPath = join(
    homedir(),
    "Library",
    "Application Support",
    "Ask ChatGPT",
  );
  let runtime: { pid?: number; busy?: boolean } = {};
  try {
    runtime = JSON.parse(await readFile(join(dataPath, "window.json"), "utf8"));
  } catch {
    /* Window is not running. */
  }
  if (Number.isInteger(runtime.pid) && runtime.pid! > 0) {
    let running = false;
    try {
      process.kill(runtime.pid!, 0);
      running = true;
    } catch {
      /* Stale marker. */
    }
    if (running) {
      if (runtime.busy)
        throw new Error("独立窗口仍在回答，请先停止回答，再切回 Raycast。");
      await new Promise<void>((resolve, reject) =>
        execFile(
          "/usr/bin/open",
          [
            "-n",
            "-a",
            join(homedir(), "Applications", "Ask ChatGPT.app"),
            "--args",
            "--return-to-raycast",
          ],
          (reason) => (reason ? reject(reason) : resolve()),
        ),
      );
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          process.kill(runtime.pid!, 0);
        } catch {
          running = false;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (running) throw new Error("独立窗口尚未释放会话，请稍后重新连接。");
    }
  }
  try {
    const saved = JSON.parse(
      await readFile(join(dataPath, "chat.json"), "utf8"),
    );
    if (saved.version !== 1 || !Array.isArray(saved.sessions)) return {};
    return {
      conversation: saved.sessions.find(
        (session: StoredConversation) => session.threadId === saved.activeId,
      ),
      selection: saved.selection,
    };
  } catch {
    return {};
  }
}

export function DesktopWindowLauncher(props: {
  preferences: Preferences;
  launch: LaunchProps<{ arguments: Arguments.Index }>;
  onNative: () => void;
}) {
  const once = useRef(false);
  const [error, setError] = useState("");
  async function launch() {
    setError("");
    try {
      const [value, legacy, selectionValue] = await Promise.all([
        LocalStorage.getItem<string>(LIBRARY_KEY),
        LocalStorage.getItem<string>(LEGACY_KEY),
        LocalStorage.getItem<string>(MODEL_SELECTION_KEY),
      ]);
      const library = parseLibrary(value, legacy);
      await openDesktopWindow({
        preferences: props.preferences,
        conversation: library.sessions.find(
          (session) => session.threadId === library.activeId,
        ),
        selection: selectionValue ? JSON.parse(selectionValue) : null,
        prompt:
          props.launch.fallbackText?.trim() ||
          props.launch.arguments?.prompt?.trim() ||
          "",
      });
    } catch (reason) {
      setError(messageOf(reason));
    }
  }
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    void launch();
  }, []);
  return (
    <Detail
      navigationTitle="Ask ChatGPT"
      isLoading={!error}
      markdown={
        error
          ? `## 独立窗口未能打开\n\n${error}`
          : "## 正在打开 Ask ChatGPT\n\n独立聊天窗口会继续上次的对话。"
      }
      actions={
        <ActionPanel>
          <Action
            title="重新打开独立窗口"
            icon={Icon.AppWindow}
            onAction={launch}
          />
          <Action
            title="本次在 Raycast 内聊天"
            icon={Icon.Message}
            onAction={props.onNative}
          />
          <Action
            title="选择默认聊天窗口"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
