import { execSync } from "node:child_process";
import { homedir as getHomeDir } from "node:os";
import { join as joinPaths } from "node:path";

const homeDir = getHomeDir();

// TODO: make this a separate NPM package
export const shell =
  execSync(`dscl . -read ${JSON.stringify(homeDir)} UserShell`)
    .toString("utf-8")
    .match(/^UserShell: (.+?)\s*$/is)?.[1] || "/bin/sh";

export const shellEnv = {
  PATH: `/bin:/usr/bin:${process.env.PATH}:${joinPaths(homeDir, ".bun/bin")}`,
};

export const bunDocsRawUrl = `https://raw.githubusercontent.com/oven-sh/bun/main/docs`;
export const bunBlogRssUrl = "https://bun.sh/rss.xml";

export const githubApiUrl = "https://api.github.com";
