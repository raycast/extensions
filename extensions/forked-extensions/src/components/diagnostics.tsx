import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import * as api from "../api.js";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import { getCloudSyncedPathRoot, getCommitDiffMessage, simplifyPath } from "../utils.js";

export default function Diagnostics() {
  const [status, setStatus] = useState<string>("Running diagnostics...");
  const { pop } = useNavigation();

  useEffect(() => {
    catchError(async () => {
      const forkedRepository = await api.getForkedRepository().catch(() => undefined);
      await git.resolveRepositoryPath(forkedRepository);
      const isGitInstalled = await git.checkIfGitIsValid();
      const isStatusClean = await git
        .checkIfStatusClean()
        .then(() => true)
        .catch(() => false);
      const currentBranch = await git.getCurrentBranch().catch(() => undefined);
      const isMainBranch = currentBranch === "main";
      const cloudSyncedPathRoot = getCloudSyncedPathRoot(git.repositoryPath);
      const localForkedRepository = await git.getForkedRepository();
      const remoteForkedRepository = localForkedRepository
        ? await api.repositoryExists(localForkedRepository)
        : "✅ Cannot determine (no local repository found)";

      const commitDiffMessageOptions = { includeAhead: true, includeZeroAhead: true, alwaysShow: true };

      const githubCommitDiff = localForkedRepository ? await api.compareTwoCommits(localForkedRepository) : undefined;
      const githubCommitDiffPass = githubCommitDiff && !(githubCommitDiff.ahead > 0 || githubCommitDiff.behind > 0);
      const githubCommitDiffAhead = githubCommitDiff && githubCommitDiff.ahead > 0;
      const githubCommitDiffMessage = getCommitDiffMessage(githubCommitDiff, commitDiffMessageOptions).trim();
      const githubCommitDiffGuide = githubCommitDiffPass
        ? ""
        : githubCommitDiffAhead
          ? " (You have commits ahead of remote on GitHub, please reset them if necessary)"
          : ' (You can use "Sync Remote" action to sync changes)';

      const localCommitDiff = await git.getAheadBehindCommits().catch(() => undefined);
      const localCommitDiffPass = localCommitDiff && !(localCommitDiff.ahead > 0 || localCommitDiff.behind > 0);
      const localCommitDiffAhead = localCommitDiff && localCommitDiff.ahead > 0;
      const localCommitDiffMessage = getCommitDiffMessage(localCommitDiff, commitDiffMessageOptions).trim();
      const localCommitDiffGuide = localCommitDiffPass
        ? ""
        : localCommitDiffAhead
          ? " (You have local commits ahead of remote, please reset them if necessary)"
          : ' (You can use "Pull Changes" action to sync changes)';

      // [TODO] The conditions need to be refactored to be more clear and robust.
      const status = [
        "## Diagnostics",
        "### Git status",
        isGitInstalled
          ? isMainBranch
            ? isStatusClean
              ? "- ✅ Good"
              : "- ⚠️ You have uncommitted changes. Please commit or stash them before performing operations."
            : `- ⚠️ You're not on the 'main' branch (current on '${currentBranch}'). Please switch to the 'main' branch to ensure proper functionality.`
          : "- ⚠️ Git is not installed or not found. Please set up your Git executable file path manually in the extension preferences.",
        "### Repository path",
        cloudSyncedPathRoot
          ? `- ⚠️ [${simplifyPath(git.repositoryPath)} 📁](file://${git.repositoryPath}) is inside ${cloudSyncedPathRoot} and may be affected by iCloud or other cloud sync tools.`
          : `- ✅ [${simplifyPath(git.repositoryPath)} 📁](file://${git.repositoryPath})`,
        "### Local forked repository",
        isMainBranch
          ? localForkedRepository
            ? [
                `- ✅ [${localForkedRepository} 📁](file://${git.repositoryPath})`,
                `- ${localCommitDiffPass ? "✅" : "⚠️"} ${localCommitDiffMessage}${localCommitDiffGuide}`,
              ]
                .filter(Boolean)
                .join("\n")
            : "- ⚠️ Not found, please rerun the extension to re-initialize the repository."
          : "- ⚠️ Not on a main branch",
        "###  Remote forked repository",
        isMainBranch
          ? remoteForkedRepository === true
            ? [
                `- ✅ [${localForkedRepository} 🌐](https://github.com/${localForkedRepository})`,
                localForkedRepository
                  ? `- ${githubCommitDiffPass ? "✅" : "⚠️"} ${githubCommitDiffMessage}${githubCommitDiffGuide}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n")
            : remoteForkedRepository !== false
              ? remoteForkedRepository
              : "- ⚠️ Not found, please check if the repository still exists on GitHub or if your GitHub token has the necessary permissions."
          : "- ⚠️ Not on a main branch",
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
