export const WECHAT_DEVTOOL_CLI_PATH = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";

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
