import { Action, Clipboard, Icon, Keyboard, showToast, Toast, showHUD } from "@raycast/api";
import { execFileSync } from "child_process";

import { ExtensionError, getCliPath, handleErrors, titleCaseWord } from "../utils";

export function CopyToClipboard({
  id,
  vault_id,
  shortcut,
  field = "password",
  attribute,
}: {
  id: string;
  field?: string;
  shortcut: Keyboard.Shortcut;
  vault_id: string;
  attribute?: string;
}) {
  const cliPath = getCliPath();

  return (
    <Action
      icon={Icon.Clipboard}
      title={`Copy ${titleCaseWord(field)}`}
      shortcut={shortcut}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Copying ${field}...`,
        });
        try {
          let stdout;
          if (attribute === "otp") {
            // based on OTP-type not field name
            stdout = execFileSync(cliPath, ["item", "get", id, "--otp"]);
          } else {
            const attributeQueryParam = attribute ? `?attribute=${attribute}` : "";
            const uri = `op://${vault_id}/${id}/${field}${attributeQueryParam}`;
            stdout = execFileSync(cliPath, ["read", uri]);
          }
          await Clipboard.copy(stdout.toString().trim(), { concealed: true });

          toast.style = Toast.Style.Success;
          toast.title = "Copied to clipboard";
          await showHUD(`Copied ${field} to clipboard`);
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
