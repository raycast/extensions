import { useEffect, useState } from "react";
import { Action, Icon, confirmAlert, useNavigation } from "@raycast/api";
import * as api from "../api.js";
import Diagnostics from "./diagnostics.js";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import operation from "../operation.js";
import { CommitDiff } from "../types.js";
import { getCommitDiffMessage } from "../utils.js";

export default function SyncFork({
  forkedRepository,
  lastCommitHash,
  onSyncFinished,
}: {
  forkedRepository: string | undefined;
  lastCommitHash: string | undefined;
  onSyncFinished: () => void;
}) {
  const { push } = useNavigation();
  const [commitDiff, setCommitDiff] = useState<{ github: CommitDiff; local: CommitDiff }>();

  const diagnosticsAction = {
    primaryAction: {
      title: "Run Diagnostics",
      onAction: () => {
        push(<Diagnostics />);
      },
    },
  };

  useEffect(() => {
    catchError(async () => {
      if (!forkedRepository) return;
      const githubCommitDiff = await api.compareTwoCommits(forkedRepository);
      const localCommitDiff = await git.getAheadBehindCommits();
      setCommitDiff({ github: githubCommitDiff, local: localCommitDiff });
    }, diagnosticsAction)();
  }, [forkedRepository, lastCommitHash]);

  const diffMessageOptions = {
    prependSpace: true,
    includeAhead: true,
    includeParentheses: true,
  };

  const remoteDiff = getCommitDiffMessage(commitDiff?.github, diffMessageOptions);
  const localDiff = getCommitDiffMessage(commitDiff?.local, diffMessageOptions);

  return (
    <>
      <Action
        icon={Icon.Repeat}
        title={`Sync Remote${remoteDiff}`}
        onAction={async () =>
          await confirmAlert({
            title: "Sync Remote",
            message:
              "This will update the main branch of your forked repository to match the upstream repository on both GitHub and your local machine. Do you want to continue?",
            primaryAction: {
              title: "Sync",
              onAction: catchError(async () => {
                await operation.sync();
                onSyncFinished?.();
              }, diagnosticsAction),
            },
          })
        }
      />
      <Action
        icon={Icon.ArrowDown}
        title={`Pull Changes${localDiff}`}
        onAction={() => {
          confirmAlert({
            title: "Pull Changes",
            message:
              "This will pull the latest changes from the remote forked repository to your local machine. Do you want to continue?",
            primaryAction: {
              title: "Pull",
              onAction: catchError(async () => {
                await operation.pull();
                onSyncFinished?.();
              }, diagnosticsAction),
            },
          });
        }}
      />
    </>
  );
}
