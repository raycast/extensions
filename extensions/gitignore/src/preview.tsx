import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { exportClipboard } from "./clipboard";
import { GitignoreFile } from "./types";
import { generateContents } from "./utils";

function toMarkdown(title: string, code: string | null) {
  if (code === null) {
    return undefined;
  }
  return `### ${title}\n\`\`\`\n${code}\n\`\`\``;
}

export default function GitignorePreview({
  gitignoreFiles,
  listPreview,
}: {
  gitignoreFiles: GitignoreFile[];
  listPreview?: boolean;
}) {
  const [fileContents, setFileContents] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    generateContents(gitignoreFiles, controller.signal)
      .then((contents: string) => setFileContents(contents))
      .catch((err) => {
        if (!controller.signal.aborted) {
          throw err;
        }
      });
    return () => controller.abort();
  }, [gitignoreFiles]);

  const ComponentType = listPreview ? List.Item.Detail : Detail;

  const props = listPreview
    ? {}
    : {
        navigationTitle: "Gitignore Preview",
      };

  return (
    <ComponentType
      isLoading={fileContents === null}
      {...props}
      markdown={toMarkdown(gitignoreFiles.map((f) => f.name).join(", "), fileContents)}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard(gitignoreFiles)} />
        </ActionPanel>
      }
    />
  );
}
