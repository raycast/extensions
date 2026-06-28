import { Action, Icon } from "@raycast/api";
import { existsSync } from "fs";

/**
 * Basic actions for managing a file.
 */
export function FileManagerActions({ filePath, onOpen }: { filePath: string; onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <>
      <Action.Open
        title="Open"
        target={filePath}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onOpen={onOpen}
      />
      <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd", "opt"], key: "o" }} onOpen={onOpen} />
      <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
    </>
  );
}
