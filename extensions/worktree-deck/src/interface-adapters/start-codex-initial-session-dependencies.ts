import type { StartCodexInitialSessionDependencies } from "../application/start-codex-initial-session.usecase";
import {
  loadCodexInitialSessionDefaultsFromGlobalConfig,
  startCodexInitialSessionWithAppServer,
} from "../infrastructure/codex-app-server-infra";

/**
 * Codex 初回セッション開始の外部実装
 */
type StartCodexInitialSessionInfra = {
  loadCodexInitialSessionDefaultsFromGlobalConfig(args: {
    repoRoot: string;
  }): ReturnType<typeof loadCodexInitialSessionDefaultsFromGlobalConfig>;
  startCodexInitialSessionWithAppServer: typeof startCodexInitialSessionWithAppServer;
};

/**
 * Codex 初回セッション開始ユースケースの依存を組み立てる
 */
function createStartCodexInitialSessionDependencies(
  infra: StartCodexInitialSessionInfra,
): StartCodexInitialSessionDependencies {
  return {
    loadDefaults: infra.loadCodexInitialSessionDefaultsFromGlobalConfig,
    start: infra.startCodexInitialSessionWithAppServer,
  };
}

/**
 * デフォルトの Codex 初回セッション開始依存を組み立てる
 */
export function createDefaultStartCodexInitialSessionDependencies(): StartCodexInitialSessionDependencies {
  return createStartCodexInitialSessionDependencies({
    loadCodexInitialSessionDefaultsFromGlobalConfig,
    startCodexInitialSessionWithAppServer,
  });
}
