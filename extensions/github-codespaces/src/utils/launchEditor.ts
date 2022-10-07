import { open } from "@raycast/api";
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
    .exhaustive();
