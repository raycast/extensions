import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";

export function LibraryProblem({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry?: () => void;
}) {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  const denied =
    code === "EACCES" ||
    code === "EPERM" ||
    (error && /EACCES|EPERM|not permitted/i.test(error.message));
  return (
    <Detail
      markdown={`# ${denied ? "Cannot Read Cleft Exports" : "Connect your Cleft notes"}\n\n${denied ? "This Raycast command could not read the export folder. In Cleft Settings → Local Sync, use Show path to find the active folder. Choose that exact folder with the Local Sync Folder directory picker in extension settings, then use Retry Reading Folder. Selecting a folder does not by itself confirm read access.\n\nIf macOS requests access, check that the request concerns Raycast and the intended Cleft folder. If it still fails, record the exact permission wording before changing broader access." : "Search uses Cleft’s Local Sync Markdown files. Open Cleft Settings → Local Sync, enable Save notes as files, and use Show path to find the active folder. Choose that folder with the Local Sync Folder directory picker in extension settings, then retry."}\n\nUse **Save existing notes as files** in Cleft only if you want older notes included. Search is read-only, and edits to exported copies do not sync back to Cleft.\n\n${error && !denied ? `**Status:** ${error.message}` : ""}`}
      actions={
        <ActionPanel>
          <Action
            title="Choose Local Sync Folder"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          {onRetry && (
            <Action
              title="Retry Reading Folder"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          )}
          <Action.OpenInBrowser
            title="Read Local Sync Guide"
            url="https://learn.cleftnotes.com/user-guides/integrations/local-sync/overview"
          />
        </ActionPanel>
      }
    />
  );
}
