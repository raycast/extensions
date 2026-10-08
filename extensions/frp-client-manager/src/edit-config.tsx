import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import {
  confirmReload,
  findFrpcBinary,
  getConfigPath,
  getPrefs,
  reloadConfig,
  verifyConfig,
} from "./frp";

export default function Command() {
  const prefs = getPrefs();
  const configPath = getConfigPath(prefs.frpDir);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (path: string, dir: string) => {
      const [text, binaryPath] = await Promise.all([
        readFile(path, "utf8"),
        findFrpcBinary(dir),
      ]);
      return { text, binaryPath };
    },
    [configPath, prefs.frpDir],
  );

  const markdown = data ? fence("toml", data.text) : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? errorMarkdown(configPath, error)
          : markdown || "_Unable to read frpc.toml_"
      }
      actions={
        <ActionPanel>
          <Action
            title="Open in Default Editor"
            icon={Icon.Pencil}
            onAction={() => open(configPath)}
          />
          <Action
            title="Verify Config"
            icon={Icon.Checkmark}
            onAction={() => handleVerify(data?.binaryPath, configPath)}
          />
          <Action
            title="Reload Config"
            icon={Icon.Repeat}
            onAction={handleReload}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}

async function handleVerify(
  binaryPath: string | undefined,
  configPath: string,
) {
  if (!binaryPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "frpc binary not found",
      message: "Expected a frp_*_<platform> directory inside the frp directory",
    });
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Verifying config…",
  });
  const result = await verifyConfig(binaryPath, configPath);
  toast.style = result.ok ? Toast.Style.Success : Toast.Style.Failure;
  toast.title = result.ok ? "Config valid" : "Config invalid";
  toast.message = result.output;
}

async function handleReload() {
  if (!(await confirmReload())) {
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reloading config…",
  });
  const result = await reloadConfig();
  toast.style = result.ok ? Toast.Style.Success : Toast.Style.Failure;
  toast.title = result.ok ? "Config reloaded" : "Reload failed";
  toast.message = result.message;
}

function errorMarkdown(configPath: string, error: Error): string {
  return [
    "## Cannot read frpc.toml",
    "",
    `\`${configPath}\``,
    "",
    "```",
    error.message,
    "```",
    "",
    "Check the **frp Directory** preference, or create the file and reload this command.",
  ].join("\n");
}

function fence(lang: string, body: string): string {
  const matches = body.match(/`{3,}/g);
  const width = matches
    ? Math.max(...matches.map((item) => item.length)) + 1
    : 3;
  const ticks = "`".repeat(width);
  return `${ticks}${lang}\n${body}\n${ticks}`;
}
