import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import * as api from "../api.js";
import { catchError } from "../errors.js";
import * as git from "../git.js";

export default function Diagnostics() {
  const [status, setStatus] = useState<string>("Running diagnostics...");
  const { pop } = useNavigation();

  useEffect(() => {
    catchError(async () => {
      const isGitInstalled = await git.checkIfGitIsValid();
      const isStatusClean = await git
        .isStatusClean()
        .then(() => true)
        .catch(() => false);
      const localForkedRepository = await git.getForkedRepository();
      const remoteForkedRepository = localForkedRepository
        ? await api.repositoryExists(localForkedRepository)
        : "✅ Cannot determine (no local repository found)";
      const status = [
        "## Diagnostics",
        "### Git installed",
        isGitInstalled
          ? "✅ Good"
          : "⚠️ Git is not installed or not found. Please set up your Git executable file path manually in the extension preferences.",
        "### Git status clean",
        isStatusClean
          ? "✅ Good"
          : "⚠️ You have uncommitted changes. Please commit or stash them before performing operations.",
        "### Local forked repository",
        localForkedRepository
          ? `✅ ${localForkedRepository}`
          : "⚠️ Not found, please rerun the extension to re-initialize the repository.",
        "###  Remote forked repository",
        remoteForkedRepository === true
          ? `✅ ${localForkedRepository}`
          : remoteForkedRepository === false
            ? "⚠️ Not found, please check if the repository still exists on GitHub or if your GitHub token has the necessary permissions."
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
