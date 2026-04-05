import { Detail, ActionPanel, Action, showHUD, PopToRootType, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import NotFoundView from "./views/not-found";
import { isApfelInstalled } from "./api/apfel";
import { getFinderSelection, isDirectory } from "./utils/finder";
import { apfelExplainFile } from "./api/apfel/explain-file";
import { statSync } from "fs";
import { basename } from "path";
import { useHistory } from "./hooks/useHistory";
import { v4 as uuidv4 } from "uuid";

export default function ExplainFile() {
  if (!isApfelInstalled()) return <NotFoundView />;

  const history = useHistory();

  const { isLoading, data } = usePromise(async () => {
    const result = await getFinderSelection();

    if (result.type === "permission_error") return;
    if (result.type === "empty") {
      await showHUD("No item selected", { popToRootType: PopToRootType.Suspended });
      return;
    }

    if (isDirectory(result.path)) {
      await showHUD("Selected item is not a file", { popToRootType: PopToRootType.Suspended });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Getting your explanation…" });

    const explanation = await apfelExplainFile(result.path);
    const stat = statSync(result.path);

    await history.add({
      id: uuidv4(),
      question: `Explain File: ${result.path}`,
      answer: explanation,
      created_at: new Date().toISOString(),
      metadata: [
        { title: "Name", text: basename(result.path) },
        { title: "Path", text: result.path },
        { title: "Size", text: `${(stat.size / 1024).toFixed(1)} KB` },
        { title: "Created", text: stat.birthtime.toLocaleString() },
        { title: "Modified", text: stat.mtime.toLocaleString() },
      ],
    });

    await showToast({ style: Toast.Style.Success, title: "Got your explanation!" });

    return {
      explanation,
      path: result.path,
      name: basename(result.path),
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
