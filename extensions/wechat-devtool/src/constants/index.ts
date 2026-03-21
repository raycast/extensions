import os from "node:os";
import path from "node:path";

export const EXTENSION_TITLE = "WeChat DevTool";

export const IS_MACOS = process.platform === "darwin";

export const IS_WINDOWS = process.platform === "win32";

export const PREVIEW_QRCODE_DIR = path.join(os.tmpdir(), "raycast-wechat-devtool");

export const DEFAULT_CLI_PATH = IS_WINDOWS
  ? "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat"
  : "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";

export const REPOSITORY_TYPE = {
  GIT: "git",
  MERCURIAL: "mercurial",
  UNKNOWN: "unknown",
} as const;

export const COMMAND = {
  GIT_CHECK: "git rev-parse --show-toplevel",
  GIT_BRANCH: "git rev-parse --abbrev-ref HEAD",
  HG_CHECK: "hg root",
  HG_BRANCH: "hg branch",
} as const;
