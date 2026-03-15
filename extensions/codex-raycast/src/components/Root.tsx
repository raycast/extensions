import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import AskForm from "./AskForm";
import { runCodexCommand } from "../utils/codex";

export enum CodexStatus {
  Checking = "checking",
  Ready = "ready",
  NotInstalled = "not-installed",
  NotLoggedIn = "not-logged-in",
  Unavailable = "unavailable",
}

export default function Root() {
  const [codexStatus, setCodexStatus] = useState<CodexStatus>(CodexStatus.Checking);

  useEffect(() => {
    async function loadReadiness() {
      try {
        const status = await ensureCodexReady();
        setCodexStatus(status);
      } catch {
        setCodexStatus(CodexStatus.Unavailable);
      }
    }
    loadReadiness();
  }, []);

  if (codexStatus === CodexStatus.Ready) {
    return <AskForm />;
  }

  return (
    <Detail
      isLoading={codexStatus === CodexStatus.Checking}
      markdown={buildMarkdown(codexStatus)}
      navigationTitle="Ask Codex"
    />
  );
}

async function ensureCodexReady(): Promise<CodexStatus> {
  try {
    await runCodexCommand("login", ["status"]);
  } catch (error) {
    if (error && error instanceof Error && error.message.includes("Not logged in")) {
      return CodexStatus.NotLoggedIn;
    }
    return CodexStatus.NotInstalled;
  }

  return CodexStatus.Ready;
}

function buildMarkdown(codexStatus: CodexStatus) {
  if (codexStatus === CodexStatus.Checking) {
    return "";
  }

  if (codexStatus === CodexStatus.Ready) {
    return "# Ask Codex";
  }

  if (codexStatus === CodexStatus.NotInstalled) {
    return buildNotInstalledMarkdown();
  }

  if (codexStatus === CodexStatus.NotLoggedIn) {
    return buildNotLoggedInMarkdown();
  }

  if (codexStatus === CodexStatus.Unavailable) {
    return buildUnavailableMarkdown();
  }
}

function buildNotInstalledMarkdown() {
  const isWindows = process.platform === "win32";
  return isWindows ? buildNotInstalledWindowsMarkdown() : buildNotInstalledUnixMarkdown();
}

function buildNotInstalledWindowsMarkdown() {
  return `# Codex setup required

Codex CLI is not available. Install \`codex\` and try again.

## What to do

### Install with npm

\`\`\`bash
npm install -g @openai/codex
\`\`\`

After installing, reopen this command.`;
}

function buildNotInstalledUnixMarkdown() {
  return `# Codex setup required

Codex CLI is not available. Install \`codex\` and try again.

## What to do

### Install with Homebrew

\`\`\`bash
brew install --cask codex
\`\`\`

### Or install with npm

\`\`\`bash
npm install -g @openai/codex
\`\`\`

After installing, reopen this command.`;
}

function buildNotLoggedInMarkdown() {
  return `# Codex login required

Codex is not logged in. Run \`codex login\` in Terminal and try again.

## What to do

Sign in through the local \`codex\` CLI, then return here.

### Run in Terminal

Login using

\`\`\`bash
codex login
\`\`\`

Check login status

\`\`\`bash
codex login status
\`\`\`
`;
}

function buildUnavailableMarkdown() {
  return `# Codex unavailable - Unknown error`;
}
