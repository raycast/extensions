import { Action, ActionPanel, Detail, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { statSync } from "fs";
import { basename } from "path";
import { v4 as uuidv4 } from "uuid";
import { apfelExplainFile } from "./api/apfel/explain-file";
import { ApfelGuard } from "./components/ApfelGuard";
import { useHistory } from "./hooks/useHistory";
import { getFinderSelection, isDirectory } from "./utils/finder";

export default function Command() {
  return (
    <ApfelGuard checkForFileSystemPermission>
      <ExplainFile />
    </ApfelGuard>
  );
}

function ExplainFile() {
  const history = useHistory();

  const { isLoading, data } = usePromise(async () => {
    const path = await getFinderSelection();

    if (!path) {
      await showHUD("No item selected");
      await popToRoot();
      return;
    }

    if (isDirectory(path)) {
      await showHUD("Selected item is not a file");
      await popToRoot();
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Getting your explanation…" });

    const explanation = await apfelExplainFile(path);
    const stat = statSync(path);

    await history.add({
      id: uuidv4(),
      question: `Explain File: ${path}`,
      answer: explanation,
      created_at: new Date().toISOString(),
      metadata: [
        { title: "Name", text: basename(path) },
        { title: "Path", text: path },
        { title: "Size", text: `${(stat.size / 1024).toFixed(1)} KB` },
        { title: "Created", text: stat.birthtime.toLocaleString() },
        { title: "Modified", text: stat.mtime.toLocaleString() },
      ],
    });

    await showToast({ style: Toast.Style.Success, title: "Got your explanation!" });

    return {
      explanation,
      path: path,
      name: basename(path),
      size: `${(stat.size / 1024).toFixed(1)} KB`,
      created: stat.birthtime,
      modified: stat.mtime,
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
            <Detail.Metadata.Label title="Size" text={data.size} />
            <Detail.Metadata.Label title="Created" text={data.created.toLocaleString()} />
            <Detail.Metadata.Label title="Modified" text={data.modified.toLocaleString()} />
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
