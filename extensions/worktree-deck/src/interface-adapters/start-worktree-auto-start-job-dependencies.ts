import type {
  StartWorktreeAutoStartJobCommand,
  StartWorktreeAutoStartJobDependencies,
  StartWorktreeAutoStartJobResult,
} from "../application/start-worktree-auto-start-job.usecase";
import { startWorktreeAutoStartJob } from "../infrastructure/worktree-auto-start-job-store";

type WorktreeAutoStartJobInfra = {
  startJob(command: StartWorktreeAutoStartJobCommand): Promise<StartWorktreeAutoStartJobResult>;
};

/**
 * Auto Start job 依存ポートを infra 実装へ接続する
 */
function createWorktreeAutoStartJobDependencies(
  infra: WorktreeAutoStartJobInfra,
): StartWorktreeAutoStartJobDependencies {
  return {
    startJob(command) {
      return infra.startJob(command);
    },
  };
}

/**
 * Auto Start job の既定依存を作成する
 */
export function createDefaultWorktreeAutoStartJobDependencies(): StartWorktreeAutoStartJobDependencies {
  return createWorktreeAutoStartJobDependencies({
    startJob: startWorktreeAutoStartJob,
  });
}
