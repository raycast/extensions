import fs from "fs";
import { ensureClaudeInstalled } from "./claude-cli";
import type { SessionMetadata } from "./session-parser";
import { launchClaudeCode } from "./terminal";
import { discoverWslClaudeStores } from "./wsl-runtime";

export function isWslSession(session: SessionMetadata): boolean {
  return Boolean(session.sources?.some((source) => source.backend === "wsl"));
}

export async function launchStoredSession(
  session: SessionMetadata,
  options: { fork?: boolean; continueLast?: boolean } = {},
): Promise<void> {
  const wslSource = session.sources?.find((source) => source.backend === "wsl");
  if (wslSource) {
    const distribution = wslSource.externalId;
    const linuxPath = wslSource.linuxPath;
    if (!distribution || !linuxPath) {
      throw new Error("This WSL Session Has Incomplete Launch Metadata");
    }
    let store = (await discoverWslClaudeStores()).find(
      (candidate) =>
        candidate.distribution.toLocaleLowerCase() ===
        distribution.toLocaleLowerCase(),
    );
    if (!store) {
      store = (await discoverWslClaudeStores(true)).find(
        (candidate) =>
          candidate.distribution.toLocaleLowerCase() ===
          distribution.toLocaleLowerCase(),
      );
    }
    if (!store) {
      throw new Error(`WSL Distribution ${distribution} Is Unavailable`);
    }
    if (!store.claudeExecutable) {
      throw new Error(
        `Install Claude Code Inside WSL Distribution ${distribution}`,
      );
    }
    await fs.promises.access(session.projectPath);
    await launchClaudeCode({
      sessionId: options.continueLast ? undefined : session.id,
      continueSession: options.continueLast,
      forkSession: options.fork,
      permissionMode: session.permissionMode,
      wsl: {
        distribution: store.distribution,
        cwd: linuxPath,
        claudeExecutable: store.claudeExecutable,
      },
    });
    return;
  }

  if (!(await ensureClaudeInstalled())) {
    return;
  }
  await fs.promises.access(session.projectPath);
  await launchClaudeCode({
    projectPath: session.projectPath,
    sessionId: options.continueLast ? undefined : session.id,
    continueSession: options.continueLast,
    forkSession: options.fork,
    permissionMode: session.permissionMode,
  });
}
