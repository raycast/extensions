import { Action, ActionPanel, Detail, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { spawnSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { basename } from "path";
import { v4 as uuidv4 } from "uuid";
import { apfelExplainDirectory } from "./api/apfel/explain-directory";
import { ApfelGuard } from "./components/ApfelGuard";
import { useHistory } from "./hooks/useHistory";
import { getFinderSelection, isDirectory } from "./utils/finder";

export default function Command() {
  return (
    <ApfelGuard checkForFileSystemPermission>
      <ExplainDirectory />
    </ApfelGuard>
  );
}

function ExplainDirectory() {
  const history = useHistory();

  const { isLoading, data } = usePromise(async () => {
    const path = await getFinderSelection();

    if (!path) {
      await showHUD("No item selected");
      await popToRoot();
      return;
    }

    if (!isDirectory(path)) {
      await showHUD("Selected item is not a directory");
      await popToRoot();
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Getting your explanation..." });
    const explanation = await apfelExplainDirectory(path);

    const stat = statSync(path);
    const items = readdirSync(path);
    const fileCount = items.filter((i) => !statSync(`${path}/${i}`).isDirectory()).length;
    const folderCount = items.filter((i) => statSync(`${path}/${i}`).isDirectory()).length;

    let gitBranch: string | null = null;
    let gitCommit: string | null = null;
    try {
      gitBranch = spawnSync("git", ["-C", path, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim();
      gitCommit = spawnSync("git", ["-C", path, "log", "--oneline", "-1"], { encoding: "utf8" }).stdout.trim();
    } catch {
      // ignore errors
    }

    await history.add({
      id: uuidv4(),
      question: `Explain Directory: ${basename(path)}`,
      answer: explanation,
      created_at: new Date().toISOString(),
      metadata: [
        { title: "Name", text: basename(path) },
        { title: "Path", text: path },
        { title: "File Count", text: `${fileCount}` },
        { title: "Folder Count", text: `${folderCount}` },
        { title: "Created", text: stat.birthtime.toLocaleString() },
        { title: "Modified", text: stat.mtime.toLocaleString() },
        gitBranch ? { title: "Git Branch", text: gitBranch ?? "N/A" } : undefined,
        gitCommit ? { title: "Git Commit", text: gitCommit ?? "N/A" } : undefined,
      ].filter(Boolean),
    });

    await showToast({ style: Toast.Style.Success, title: "Got your explanation!" });

    return {
      explanation,
      path: path,
      name: basename(path),
      fileCount: `${fileCount}`,
      folderCount: `${folderCount}`,
      created: stat.birthtime,
      modified: stat.mtime,
      gitBranch,
      gitCommit,
    };
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data?.explanation ?? ""}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Name" text={data.name} />
            <Detail.Metadata.Label title="Path" text={data.path} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Files" text={data.fileCount} />
            <Detail.Metadata.Label title="Folders" text={data.folderCount} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={data.created.toLocaleString()} />
            <Detail.Metadata.Label title="Modified" text={data.modified.toLocaleString()} />
            {data.gitBranch && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Branch" text={data.gitBranch} />
                {data.gitCommit && <Detail.Metadata.Label title="Last Commit" text={data.gitCommit} />}
              </>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        !isLoading ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Explanation" content={data?.explanation ?? ""} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={data?.path ?? ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.ShowInFinder path={data?.path ?? ""} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
