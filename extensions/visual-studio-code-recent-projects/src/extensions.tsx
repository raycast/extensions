import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  OpenExtensionByIDInBrowserAction,
  OpenExtensionByIDInVSCodeAction,
  UninstallExtensionByIDAction,
} from "./extension-actions";
import { Extension, getLocalExtensions } from "./lib/vscode";
import { getErrorMessage, isWin } from "./utils";

function OpenExtensionInVSCodeAction(props: { extension: Extension }): JSX.Element {
  return <OpenExtensionByIDInVSCodeAction extensionID={props.extension.id} />;
}

function OpenExtensionInBrowserAction(props: { extension: Extension }): JSX.Element {
  return <OpenExtensionByIDInBrowserAction extensionID={props.extension.id} />;
}

function ExtensionListItem(props: { extension: Extension; reloadExtension: () => void }): JSX.Element {
  const e = props.extension;
  return (
    <List.Item
      title={e.name}
      subtitle={e.publisherDisplayName}
      icon={{ source: e.icon || "icon.png", fallback: "icon.png" }}
      accessories={[
        { tag: e.preview === true ? { color: Color.Red, value: "Preview" } : "" },
        {
          tag: e.version,
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
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy Extension ID"
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            {e.publisherDisplayName && (
              <Action.CopyToClipboard
                content={e.publisherDisplayName}
                title="Copy Publisher Name"
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            )}
            <Action.Open
              title={isWin ? `Show in File Explorer` : `Open in Finder`}
              target={e.fsPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <UninstallExtensionByIDAction
              extensionID={e.id}
              extensionName={e.name}
              afterUninstall={props.reloadExtension}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function ExtensionsRootCommand(): JSX.Element {
  const { extensions, isLoading, error, refresh } = useLocalExtensions();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const extensionsSorted = extensions?.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Installed Extensions">
      <List.Section title="Installed Extensions" subtitle={`${extensionsSorted?.length}`}>
        {extensionsSorted?.map((e) => (
          <ExtensionListItem key={`${e.id}-${e.version}`} extension={e} reloadExtension={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

export function useLocalExtensions(): {
  extensions: Extension[] | undefined;
  isLoading?: boolean;
  error?: string;
  refresh: () => void;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [extensions, setExtensions] = useState<Extension[]>();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(new Date());

  const refresh = () => {
    setDate(new Date());
  };

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
  }, [date]);

  return { extensions: extensions, isLoading, error, refresh };
}
