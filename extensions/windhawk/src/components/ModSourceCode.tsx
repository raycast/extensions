import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { OpenInBrowserAction, RefreshAction } from "./Actions";

export default function ModSourceCode({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: source,
    error,
    revalidate,
  } = useFetch(`https://raw.githubusercontent.com/ramensoftware/windhawk-mods/refs/heads/main/mods/${id}.wh.cpp`);

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not fetch source code for ${id}` });
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Source Code`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Source Code\n\n\`\`\`cpp\n${source}\n\`\`\``}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://github.com/ramensoftware/windhawk-mods/blob/main/mods/${id}.wh.cpp`} />
          <Action.CopyToClipboard
            title="Copy Source Code"
            content={`${source}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
