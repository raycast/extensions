import { open, Clipboard, showHUD } from "@raycast/api";
import { match } from "ts-pattern";
import { preferredEditor, useInsiders } from "../preferences";
import { Client, Codespace } from "../types";

export const launchEditor = ({
  codespace,
  client,
}: {
  codespace: Codespace;
  client?: Client;
}) =>
  match(client || preferredEditor)
    .with("web", () => open(codespace.web_url))
    .with("vscode", () =>
      open(
        `${
          useInsiders ? "vscode-insiders" : "vscode"
        }://github.codespaces/connect?name=${codespace.name}&windowId=_blank`
      )
    )
    .with("ssh", async () => {
      await Clipboard.copy(`gh codespace ssh -c ${codespace.name}`);
      await showHUD(
        "SSH command copied to clipboard; Paste into your terminal to connect"
      );
    })
    .exhaustive();
