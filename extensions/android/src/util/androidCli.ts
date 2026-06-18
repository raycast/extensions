import {
  confirmAlert,
  getPreferenceValues,
  Toast,
  showToast,
} from "@raycast/api";
import fs from "fs";
import os from "os";
import { CommandRunner, defaultCommandRunner } from "./commandRunner";
import { quoteArg } from "./shell";
import {
  installCommandForArch,
  resolveAndroidCliPath,
} from "./androidCliResolver";
import {
  DocsArticle,
  DocsSearchResult,
  parseDocsFetch,
  parseDocsSearch,
} from "./androidDocs";
import {
  CreateProjectOptions,
  ProjectTemplate,
  buildCreateCommand,
  parseTemplateList,
} from "./androidCreate";

// Single module that owns all interaction with the `android` CLI: binary
// resolution (cached for the session), the permission-gated install flow, and
// running the doc commands through the shared execution seam. The pure parsers
// and resolution logic live in raycast-free siblings and are re-exported so
// callers have one import surface.
export type { DocsArticle, DocsSearchResult } from "./androidDocs";
export type { CreateProjectOptions, ProjectTemplate } from "./androidCreate";
export { projectDestination } from "./androidCreate";
export { toDeveloperUrl } from "./androidDocs";
export { installCommandForArch, expandHome } from "./androidCliResolver";

export const INSTALL_DOCS_URL =
  "https://developer.android.com/tools/agents/android-cli";

let cachedCliPath: string | undefined;

/** Resolve (and cache for the session) the `android` binary path. */
export async function getAndroidCliPath(
  runner: CommandRunner = defaultCommandRunner
): Promise<string | undefined> {
  if (cachedCliPath) {
    return cachedCliPath;
  }
  const preferencePath =
    (getPreferenceValues().androidCliPath as string | undefined) ?? "";
  const resolved = await resolveAndroidCliPath({
    preferencePath,
    runner,
    fileExists: fs.existsSync,
    homeDir: os.homedir(),
  });
  cachedCliPath = resolved;
  return resolved;
}

function clearAndroidCliCache(): void {
  cachedCliPath = undefined;
}

/**
 * Permission-gated install: confirm with the user, run the official per-arch
 * installer with a progress toast, then re-resolve. Returns the resolved path
 * on success, undefined if the user declined or the install failed.
 *
 * NOTE: this is shipped for end-users; it is never executed during development.
 */
export async function installAndroidCli(
  runner: CommandRunner = defaultCommandRunner
): Promise<string | undefined> {
  const confirmed = await confirmAlert({
    title: "Install the Android CLI?",
    message:
      "The `android` command-line tool isn't installed. Install the official build for your Mac now?",
    primaryAction: { title: "Install" },
  });
  if (!confirmed) {
    return undefined;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing Android CLI…",
  });
  try {
    const command = installCommandForArch(process.arch);
    await runner.exec(command);
    clearAndroidCliCache();
    const resolved = await getAndroidCliPath(runner);
    if (resolved) {
      toast.style = Toast.Style.Success;
      toast.title = "Android CLI installed";
      return resolved;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Install finished but the CLI couldn't be found";
    return undefined;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to install the Android CLI";
    toast.message = String(error);
    return undefined;
  }
}

/** Run `android docs search <query>` and return parsed results. */
export async function runDocsSearch(
  query: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<DocsSearchResult[]> {
  const cli = await requireCli(runner);
  const stdout = await runner.exec(
    `${quoteArg(cli)} docs search ${quoteArg(query)}`
  );
  return parseDocsSearch(stdout);
}

/** Run `android docs fetch <kb-url>` and return the parsed article. */
export async function runDocsFetch(
  kbUrl: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<DocsArticle> {
  const cli = await requireCli(runner);
  const stdout = await runner.exec(
    `${quoteArg(cli)} docs fetch ${quoteArg(kbUrl)}`
  );
  return parseDocsFetch(stdout);
}

/** Run `android create --list` and return the available project templates. */
export async function runTemplateList(
  runner: CommandRunner = defaultCommandRunner
): Promise<ProjectTemplate[]> {
  const cli = await requireCli(runner);
  const stdout = await runner.exec(`${quoteArg(cli)} create --list`);
  return parseTemplateList(stdout);
}

/**
 * Run `android create` to scaffold a project from the form options and return
 * the absolute path of the created project directory. `options.outputDir` is
 * the project's own directory (computed by the caller via
 * {@link projectDestination}), since the CLI scaffolds directly into its `-o`.
 */
export async function runCreateProject(
  options: CreateProjectOptions,
  runner: CommandRunner = defaultCommandRunner
): Promise<string> {
  const cli = await requireCli(runner);
  await runner.exec(buildCreateCommand(cli, options));
  return options.outputDir;
}

async function requireCli(runner: CommandRunner): Promise<string> {
  const cli = await getAndroidCliPath(runner);
  if (!cli) {
    // Surface the shared-foundation failure in the `ray develop` console: the
    // binary could not be found via the preference, the login-shell PATH lookup,
    // or any known install location.
    console.error(
      "[android] CLI binary could not be resolved (preference, login-shell PATH, and known locations all failed)"
    );
    throw new Error("Android CLI is not installed");
  }
  return cli;
}
