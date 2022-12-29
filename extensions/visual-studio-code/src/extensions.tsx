import { Action, ActionPanel, Color, List, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getErrorMessage } from "./utils";
import { Extension, getLocalExtensions } from "./lib/vscode";

function OpenExtensionInVSCodeAction(props: { extension: Extension }): JSX.Element {
  const e = props.extension;
  return (
    <Action.OpenInBrowser
      title="Open in VSCode"
      url={`vscode:extension/${e.id}`}
      icon={"icon.png"}
      onOpen={() => {
        popToRoot();
        showHUD("Open VSCode Extension");
      }}
    />
  );
}

function OpenExtensionInBrowserAction(props: { extension: Extension }): JSX.Element {
  const e = props.extension;
  const url = `https://marketplace.visualstudio.com/items?itemName=${e.id}`;
  return (
    <Action.OpenInBrowser
      title="Open in Browser"
      url={url}
      onOpen={() => {
        popToRoot();
        showHUD("Open VSCode Extension in Browser");
      }}
    />
  );
}

function ExtensionListItem(props: { extension: Extension }): JSX.Element {
  const e = props.extension;
  return (
    <List.Item
      title={e.name}
      subtitle={e.publisherDisplayName}
      icon={{ source: e.icon || "icon.png", fallback: "icon.png" }}
      accessories={[
        { tag: e.preview === true ? { color: Color.Red, value: "Preview" } : "" },
        {
          text: e.version,
          tooltip: e.installedTimestamp ? `Installed:  ${new Date(e.installedTimestamp).toLocaleString()}` : "",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenExtensionInVSCodeAction extension={e} />
            <OpenExtensionInBrowserAction extension={e} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={e.id}
              title="Copy Extension ID"
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              content={e.publisherDisplayName}
              title="Copy Publisher Name"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
            <Action.Open
              title="Open in Finder"
              target={e.fsPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function ExtensionsRootCommand(): JSX.Element {
  const { extensions, isLoading, error } = useLocalExtensions();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const extensionsSorted = extensions?.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return (
    <List isLoading={isLoading}>
      <List.Section title="Installed Extensions" subtitle={`${extensionsSorted?.length}`}>
        {extensionsSorted?.map((e) => (
          <ExtensionListItem key={e.id} extension={e} />
        ))}
      </List.Section>
    </List>
  );
}

export function useLocalExtensions(): {
  extensions: Extension[] | undefined;
  isLoading?: boolean;
  error?: string;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [extensions, setExtensions] = useState<Extension[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let didUnmount = false;
    async function fetchCommands() {
      if (didUnmount) {
        return;
      }
      setIsLoading(true);
      setError(undefined);
      try {
        const exts = await getLocalExtensions();
        if (!didUnmount) {
          setExtensions(exts);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }
    fetchCommands();
    return () => {
      didUnmount = true;
    };
  }, []);

  return { extensions: extensions, isLoading, error };
}
