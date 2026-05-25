import type { OpenCodexAppDependencies } from "../application/open-codex-app.usecase";
import { openPathInCodexApp } from "../infrastructure/codex-app-infra";

/**
 * Codex App 起動の外部実装
 */
type CodexAppInfra = {
  openPathInCodexApp(path: string): Promise<void>;
};

/**
 * Codex App 起動ユースケースの依存を組み立てる
 */
function createOpenCodexAppDependencies(infra: CodexAppInfra): OpenCodexAppDependencies {
  return {
    openPathInCodexApp: infra.openPathInCodexApp,
  };
}

/**
 * デフォルトの Codex App 起動依存を組み立てる
 */
export function createDefaultOpenCodexAppDependencies(): OpenCodexAppDependencies {
  return createOpenCodexAppDependencies({
    openPathInCodexApp,
  });
}
