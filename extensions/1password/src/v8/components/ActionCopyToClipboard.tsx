import { useEffect, useState } from "react";
import { Action, Clipboard, Icon, Keyboard, showToast, Toast, showHUD, getFrontmostApplication } from "@raycast/api";
import { execFileSync } from "child_process";

import { ExtensionError, getCliPath, handleErrors, titleCaseWord } from "../utils";

export function CopyToClipboard({
  id,
  vault_id,
  shortcut,
  field = "password",
  attribute,
  paste,
}: {
  id: string;
  field?: string;
  shortcut: Keyboard.Shortcut;
  vault_id: string;
  attribute?: string;
  paste?: boolean;
}) {
  const cliPath = getCliPath();
  const [frontAppName, setFrontAppName] = useState<string | undefined>(undefined);
  const [frontAppIcon, setFrontAppIcon] = useState<{ fileIcon: string } | undefined>(undefined);

  useEffect(() => {
    if (!paste) return;
    getFrontmostApplication()
      .then((app) => {
        setFrontAppName(app.name);
        if (app.path) setFrontAppIcon({ fileIcon: app.path });
      })
      .catch(() => {
        // ignore, fall back to default icon/title
      });
  }, [paste]);

  return (
    <Action
      icon={paste ? (frontAppIcon ?? Icon.Text) : Icon.Clipboard}
      title={
        paste
          ? `Paste ${titleCaseWord(field)}${frontAppName ? ` to ${frontAppName}` : ""}`
          : `Copy ${titleCaseWord(field)}`
      }
      shortcut={shortcut}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: paste ? `Pasting ${field}${frontAppName ? ` to ${frontAppName}` : ""}...` : `Copying ${field}...`,
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
          const value = stdout.toString().trim();
          if (paste) {
            await Clipboard.paste(value);
            toast.style = Toast.Style.Success;
            toast.title = `Pasted ${field}${frontAppName ? ` to ${frontAppName}` : ""}`;
            await showHUD(`Pasted ${field}${frontAppName ? ` to ${frontAppName}` : ""}`);
          } else {
            await Clipboard.copy(value, { concealed: true });
            toast.style = Toast.Style.Success;
            toast.title = "Copied to clipboard";
            await showHUD(`Copied ${field} to clipboard`);
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to ${paste ? "paste" : "copy"}`;
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
                  title: paste ? "Paste logs" : "Copy logs",
                  onAction: async (toast) => {
                    await Clipboard.copy((err as Error).message);
                    toast.hide();
                  },
                };
              } else if (err instanceof Error) {
                toast.title = err.message;
                toast.primaryAction = {
                  title: paste ? "Paste logs" : "Copy logs",
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
