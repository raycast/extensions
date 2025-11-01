import { Action, Clipboard, Icon, Keyboard, showToast, Toast, showHUD } from "@raycast/api";
import { execFileSync } from "child_process";

import { ExtensionError, getCliPath, handleErrors, titleCaseWord } from "../utils";
import { useFrontmostApp } from "../hooks/useFrontmostApp";

export function CopyToClipboard({
  id,
  vault_id,
  shortcut,
  field = "password",
  attribute,
  isPasteAction,
}: {
  id: string;
  field?: string;
  shortcut: Keyboard.Shortcut;
  vault_id: string;
  attribute?: string;
  isPasteAction?: boolean;
}) {
  const cliPath = getCliPath();
  const frontmostApp = useFrontmostApp(!!isPasteAction);

  return (
    <Action
      icon={isPasteAction ? (frontmostApp.icon ?? Icon.Text) : Icon.Clipboard}
      title={
        isPasteAction
          ? `Paste ${titleCaseWord(field)}${frontmostApp.name ? ` to ${frontmostApp.name}` : ""}`
          : `Copy ${titleCaseWord(field)}`
      }
      shortcut={shortcut}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: isPasteAction
            ? `Pasting ${field}${frontmostApp.name ? ` to ${frontmostApp.name}` : ""}...`
            : `Copying ${field}...`,
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
          if (isPasteAction) {
            await Clipboard.paste(value);
            toast.style = Toast.Style.Success;
            toast.title = `Pasted ${field}${frontmostApp.name ? ` to ${frontmostApp.name}` : ""}`;
            await showHUD(`Pasted ${field}${frontmostApp.name ? ` to ${frontmostApp.name}` : ""}`);
          } else {
            await Clipboard.copy(value, { concealed: true });
            toast.style = Toast.Style.Success;
            toast.title = "Copied to clipboard";
            await showHUD(`Copied ${field} to clipboard`);
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to ${isPasteAction ? "paste" : "copy"}`;
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
