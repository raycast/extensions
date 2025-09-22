import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import * as api from "../api.js";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import { getCommitDiffMessage } from "../utils.js";

export default function Diagnostics() {
  const [status, setStatus] = useState<string>("Running diagnostics...");
  const { pop } = useNavigation();

  useEffect(() => {
    catchError(async () => {
      const isGitInstalled = await git.checkIfGitIsValid();
      const isStatusClean = await git
        .checkIfStatusClean()
        .then(() => true)
        .catch(() => false);
      const localForkedRepository = await git.getForkedRepository();
      const remoteForkedRepository = localForkedRepository
        ? await api.repositoryExists(localForkedRepository)
        : "✅ Cannot determine (no local repository found)";

      const commitDiffMessageOptions = { includeAhead: true, includeZeroAhead: true, alwaysShow: true };

      const githubCommitDiff = localForkedRepository ? await api.compareTwoCommits(localForkedRepository) : undefined;
      const githubCommitDiffPass = githubCommitDiff && !(githubCommitDiff.ahead > 0 || githubCommitDiff.behind > 0);
      const githubCommitDiffMessage = getCommitDiffMessage(githubCommitDiff, commitDiffMessageOptions).trim();
      const githubCommitDiffGuide = githubCommitDiffPass ? "" : ' (You can use "Sync Remote" action to sync changes)';

      const localCommitDiff = await git.getAheadBehindCommits();
      const localCommitDiffPass = !(localCommitDiff.ahead > 0 || localCommitDiff.behind > 0);
      const localCommitDiffMessage = getCommitDiffMessage(localCommitDiff, commitDiffMessageOptions).trim();
      const localCommitDiffGuide = localCommitDiffPass ? "" : ' (You can use "Pull Changes" action to sync changes)';

      const status = [
        "## Diagnostics",
        "### Git status",
        isGitInstalled
          ? isStatusClean
            ? "- ✅ Good"
            : "- ⚠️ You have uncommitted changes. Please commit or stash them before performing operations."
          : "- ⚠️ Git is not installed or not found. Please set up your Git executable file path manually in the extension preferences.",
        "### Local forked repository",
        localForkedRepository
          ? [
              `- ✅ [${localForkedRepository} 📁](file://${git.repositoryPath})`,
              `- ${localCommitDiffPass ? "✅" : "⚠️"} ${localCommitDiffMessage}${localCommitDiffGuide}`,
            ]
              .filter(Boolean)
              .join("\n")
          : "- ⚠️ Not found, please rerun the extension to re-initialize the repository.",
        "###  Remote forked repository",
        remoteForkedRepository === true
          ? [
              `- ✅ [${localForkedRepository} 🌐](https://github.com/${localForkedRepository})`,
              localForkedRepository
                ? `- ${githubCommitDiffPass ? "✅" : "⚠️"} ${githubCommitDiffMessage}${githubCommitDiffGuide}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : remoteForkedRepository === false
            ? "- ⚠️ Not found, please check if the repository still exists on GitHub or if your GitHub token has the necessary permissions."
            : remoteForkedRepository,
      ].join("\n\n");
      setStatus(status);
    })();
  }, []);

  return (
    <Detail
      markdown={status}
      actions={
        <ActionPanel>
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
