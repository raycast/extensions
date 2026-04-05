import { Detail, ActionPanel, Action, showHUD, PopToRootType, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { apfelExplainDirectory } from "./api/apfel/explain-directory";
import NotFoundView from "./views/not-found";
import { isApfelInstalled } from "./api/apfel";
import { getFinderSelection, isDirectory } from "./utils/finder";
import { statSync, readdirSync } from "fs";
import { basename } from "path";
import { execSync } from "child_process";
import { useHistory } from "./hooks/useHistory";
import { v4 as uuidv4 } from "uuid";

export default function ExplainDirectory() {
  if (!isApfelInstalled()) return <NotFoundView />;

  const history = useHistory();

  const { isLoading, data } = usePromise(async () => {
    const result = await getFinderSelection();

    if (result.type === "permission_error") return;
    if (result.type === "empty") {
      await showHUD("No item selected", { popToRootType: PopToRootType.Suspended });
      return;
    }

    if (!isDirectory(result.path)) {
      await showHUD("Selected item is not a directory", { popToRootType: PopToRootType.Suspended });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Getting your explanation..." });
    const explanation = await apfelExplainDirectory(result.path);

    const stat = statSync(result.path);
    const items = readdirSync(result.path);
    const fileCount = items.filter((i) => !statSync(`${result.path}/${i}`).isDirectory()).length;
    const folderCount = items.filter((i) => statSync(`${result.path}/${i}`).isDirectory()).length;

    let gitBranch: string | null = null;
    let gitCommit: string | null = null;
    try {
      gitBranch = execSync(`git -C "${result.path}" branch --show-current 2>/dev/null`, { encoding: "utf8" }).trim();
      gitCommit = execSync(`git -C "${result.path}" log --oneline -1 2>/dev/null`, { encoding: "utf8" }).trim();
    } catch {
      // ignore errors
    }

    await history.add({
      id: uuidv4(),
      question: `Explain Directory: ${basename(result.path)}`,
      answer: explanation,
      created_at: new Date().toISOString(),
      metadata: [
        { title: "Name", text: basename(result.path) },
        { title: "Path", text: result.path },
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
      path: result.path,
      name: basename(result.path),
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
