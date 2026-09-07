import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ReactElement, useCallback, useState } from "react";
import { forgetCliResolution, resolveCli } from "../lib/cli";

const REPO_URL = "https://github.com/xingkongliang/skills-manager";

/**
 * Renders `children` only once a usable CLI has been resolved, and otherwise
 * explains what to do about it. Every command wraps its body in this so no view
 * has to handle a missing binary itself.
 */
export function CliGuard({ children }: { children: () => ReactElement }) {
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    forgetCliResolution();
    setAttempt((value) => value + 1);
  }, []);

  // `attempt` is the retry trigger: resolution reads the disk synchronously, so
  // re-rendering is all it takes to probe again.
  void attempt;
  const resolution = resolveCli();

  if (resolution.status === "bridge_broken") return <BridgeBroken onRetry={retry} binDir={resolution.binDir} />;
  if (resolution.status === "not_installed") return <NotInstalled onRetry={retry} />;
  return children();
}

function GuidanceActions({ onRetry }: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action.OpenInBrowser title="Open Skills Manager on GitHub" url={REPO_URL} />
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function NotInstalled({ onRetry }: { onRetry: () => void }) {
  const markdown = `# Skills Manager not found

This extension drives the \`skills-manager-cli\` binary, and no copy of it could be found on this Mac.

## Install it

\`\`\`bash
brew install --cask skills-manager
\`\`\`

Or download a release from [the project page](${REPO_URL}/releases).

Open the app once after installing — it publishes a version-matched CLI to \`~/.skills-manager/bin\`, which is the copy this extension prefers.

## Already installed somewhere unusual?

Set **CLI Path** in this extension's preferences to the absolute path of your binary.`;

  return <Detail markdown={markdown} actions={<GuidanceActions onRetry={onRetry} />} />;
}

function BridgeBroken({ onRetry, binDir }: { onRetry: () => void; binDir: string }) {
  const markdown = `# The CLI bridge is incomplete

\`${binDir}\` holds part of a published CLI but not a working one — either a binary with no version stamp, or a stamp with no binary beside it. That is what a copy interrupted half-way leaves behind.

## Fix it

**Open the Skills Manager app once.** It republishes the CLI and writes the stamp that marks it verified.

## Why this extension stops here

The stamp is what guarantees the CLI matches the app you are running. An unstamped binary could predate a safety fix, so this extension will not fall back to another copy on your \`PATH\` while a desktop app of an unknown version is installed. Nothing is wrong with your skill library — only the bridge to it.`;

  return <Detail markdown={markdown} actions={<GuidanceActions onRetry={onRetry} />} />;
}
