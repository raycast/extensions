import { Action, Clipboard, Icon, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { execFileSync } from "node:child_process";

import { ExtensionError, getCliPath, handleErrors } from "../utils";

export function ShareItem({ id, shortcut, title }: { id: string; shortcut: Keyboard.Shortcut; title: string }) {
  return (
    <Action
      icon={Icon.Link}
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
                  onAction: async (toast) => {
                    await Clipboard.copy((err as Error).message);
                    toast.hide();
                  },
                  title: "Copy logs",
                };
              } else if (err instanceof Error) {
                toast.title = err.message;
                toast.primaryAction = {
                  onAction: async (toast) => {
                    await Clipboard.copy((err as Error).message);
                    toast.hide();
                  },
                  title: "Copy logs",
                };
              }
            }
          }
        }
      }}
      shortcut={shortcut}
      title={`Share Item`}
    />
  );
}
