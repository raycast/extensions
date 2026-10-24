import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import {
  indexFilePath,
  readIndex,
  type IndexMetadata,
} from "./lib/index-store";

type IndexState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; metadata: IndexMetadata }
  | { status: "error"; message: string };

export default function IndexStatus() {
  const [state, setState] = useState<IndexState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    readIndex()
      .then((metadata) => {
        if (!active) return;
        setState(
          metadata ? { status: "ready", metadata } : { status: "empty" },
        );
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: String(error) });
      });
    return () => {
      active = false;
    };
  }, []);

  const directory = environment.supportPath;
  const activeFile =
    state.status === "ready"
      ? indexFilePath(state.metadata)
      : path.join(directory, "index.nul");

  const markdown =
    state.status === "loading"
      ? "# Index Status\n\nReading the saved index metadata…"
      : state.status === "empty"
        ? "# No Index Yet\n\nPathSeek has not indexed anything. Nothing will be scanned automatically.\n\nChoose your folders through **Build Index**, then explicitly build your first index."
        : state.status === "error"
          ? `# Index Error\n\n${state.message}\n\nCheck the index files, then use **Build Index** to recover.`
          : `# Index Status\n\n- **Indexed paths:** ${state.metadata.count.toLocaleString()}\n- **Last built:** ${new Date(state.metadata.createdAt).toLocaleString()}\n- **Index file:** \`${state.metadata.filename}\`\n- **Format:** ${state.metadata.version === 2 ? "v2 self-describing" : "v1 legacy"}\n- **Search roots:**\n${state.metadata.roots.map((root) => `  - \`${root}\``).join("\n")}\n\nThis index is reused until you manually run Build Index. **No automatic refresh or background scanning.**`;

  return (
    <Detail
      isLoading={state.status === "loading"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={
              state.status === "empty"
                ? "Choose Folders and Build Index"
                : "Open Build Index"
            }
            icon={Icon.Folder}
            onAction={() =>
              launchCommand({
                name: "rebuild-index",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action.Open
            title="Open Index Directory in Finder"
            target={directory}
          />
          <Action.CopyToClipboard
            title="Copy Index Directory Path"
            content={directory}
          />
          <Action.CopyToClipboard
            title="Copy Active Index File Path"
            content={activeFile}
          />
          {state.status === "ready" && (
            <Action.CopyToClipboard
              title="Copy Index Details"
              content={JSON.stringify(state.metadata, null, 2)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
