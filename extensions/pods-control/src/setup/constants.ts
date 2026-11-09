import { CLI_BREW_FORMULA } from "../homebrew/constants";

export const MIN_CLI_VERSION = "v0.5.0";

export const CLI_REPO_URL = "https://github.com/raulgg/pods-control";

export const CLI_REPO_HOME_URL = `${CLI_REPO_URL}#pods-control`;

export const CLI_GITHUB_RELEASES_LATEST_URL = "https://api.github.com/repos/raulgg/pods-control/releases/latest";

export const CLI_INSTALL_DOCS_URL = `${CLI_REPO_URL}/blob/HEAD/README.md#install`;

export const CLI_INSTALL_COMMAND = `brew install ${CLI_BREW_FORMULA}`;

export const CLI_UPDATE_COMMAND = `brew upgrade ${CLI_BREW_FORMULA}`;

export const CLI_TERMINAL_UPDATE_COMMAND = `brew update\n${CLI_UPDATE_COMMAND}`;

export const CLI_SOURCE_INSTALL_COMMAND = [
  `tag=$(curl -fsSL -o /dev/null -w '%{url_effective}' ${CLI_REPO_URL}/releases/latest)`,
  `tag=\${tag##*/}`,
  `base=https://raw.githubusercontent.com/raulgg/pods-control/$tag`,
  `curl -fsSL "$base/scripts/install-from-source.sh" | sh -s -- --version "$tag"`,
].join("\n");

export const DEVELOPER_TOOLS_DOCS_URL =
  "https://developer.apple.com/documentation/xcode/installing-the-command-line-tools";
export const CLI_LINK_COMMAND = `brew link ${CLI_BREW_FORMULA}`;

export const CLI_RELINK_COMMAND = `brew link --overwrite ${CLI_BREW_FORMULA}`;

export const CLI_REINSTALL_COMMAND = `brew reinstall ${CLI_BREW_FORMULA}`;
