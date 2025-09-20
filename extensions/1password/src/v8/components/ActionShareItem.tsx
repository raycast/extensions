import { Action, Clipboard, Icon, Keyboard, showToast, Toast, showHUD } from "@raycast/api";
import { execFileSync } from "child_process";

import { ExtensionError, getCliPath, handleErrors } from "../utils";

export function ShareItem({ id, title, shortcut }: { id: string; shortcut: Keyboard.Shortcut; title: string }) {
  return (
    <Action
      icon={Icon.Link}
      title={`Share Item`}
      shortcut={shortcut}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Sharing ${title}...`,
        });
        try {
          const stdout = execFileSync(getCliPath(), ["item", "share", id]);
          await Clipboard.copy(stdout.toString().trim(), { concealed: true });

          toast.style = Toast.Style.Success;
          toast.title = "Copied to clipboard";
          await showHUD(`Copied sharing link to clipboard`);
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to copy";
          if (error instanceof Error || error instanceof ExtensionError) {
            try {
              handleErrors(error.message);
            } catch (err) {
              if (err instanceof ExtensionError) {
                if (err.title != err.message) {
                  toast.message = err.message;
                }
                toast.title = err.title;
                toast.primaryAction = {
                  title: "Copy logs",
                  onAction: async (toast) => {
                    await Clipboard.copy((err as Error).message);
                    toast.hide();
                  },
                };
              } else if (err instanceof Error) {
                toast.title = err.message;
                toast.primaryAction = {
                  title: "Copy logs",
                  onAction: async (toast) => {
                    await Clipboard.copy((err as Error).message);
                    toast.hide();
                  },
                };
              }
            }
          }
        }
      }}
    />
  );
}
