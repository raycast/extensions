import { List, ActionPanel, Action, Icon, open, closeMainWindow, showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";
import { detectWinePath } from "../utils/wine";
import { ApplicationItem } from "../types";

interface ApplicationListItemProps {
  app: ApplicationItem;
}

export function ApplicationListItem({ app }: ApplicationListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (app.comment) {
    accessories.push({ text: app.comment, tooltip: app.comment });
  }

  const launchApplication = async () => {
    try {
      const execCommand = app.exec
        .replace(/%[a-zA-Z]/g, "") // Remove Wine placeholders like %f
        .replace(/\\\\/g, "\\") // Replace double backslashes with single
        .replace(/(?<=env WINEPREFIX=[^ ]+ )wine\b/, await detectWinePath())
        .trim();

      const child = spawn(execCommand, {
        shell: true,
        stdio: "ignore",
        detached: true,
      });

      await new Promise<void>((resolve, reject) => {
        child.on("error", (error) => {
          reject(error);
        });
        child.on("spawn", () => resolve());
      });

      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Launch Application",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List.Item
      title={app.name}
      subtitle={path.basename(path.dirname(app.id))}
      accessories={accessories}
      icon={app.resolvedIconPath ? { source: app.resolvedIconPath } : Icon.AppWindow}
      actions={
        <ActionPanel>
          <Action title="Launch Application" icon={Icon.Rocket} onAction={launchApplication} />
          {app.pathValue && (
            <Action
              title="Open Working Directory"
              icon={Icon.Document}
              onAction={() => {
                open(app.pathValue!);
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
