import { Action, ActionPanel, Color, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getErrorMessage } from "./utils";
import type { Extension } from "./lib/kiro";
import { getLocalExtensions } from "./lib/kiro";
import {
  OpenExtensionByIDInBrowserAction,
  OpenExtensionByIDInKiroAction,
  UninstallExtensionByIDAction,
} from "./extension-actions";

function OpenExtensionInKiroAction(props: { extension: Extension }): JSX.Element {
  return <OpenExtensionByIDInKiroAction extensionID={props.extension.id} />;
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
        {
          tag: e.preview === true ? { color: Color.Red, value: "Preview" } : "",
        },
        {
          tag: e.version,
          tooltip: e.installedTimestamp ? `Installed:  ${new Date(e.installedTimestamp).toLocaleString()}` : "",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenExtensionInKiroAction extension={e} />
            <OpenExtensionInBrowserAction extension={e} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={e.id}
              title="Copy Extension Id"
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
              title="Open in Finder"
              target={e.fsPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <UninstallExtensionByIDAction extensionID={e.id} afterUninstall={props.reloadExtension} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function ExtensionsRootCommand(): JSX.Element {
  const { extensions, isLoading, error, refresh } = useLocalExtensions();
  if (error) {
    showFailureToast(error, { title: "Error" });
  }
  const extensionsSorted = extensions?.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Installed Extensions">
      <List.Section title="Installed Extensions" subtitle={`${extensionsSorted?.length}`}>
        {extensionsSorted?.map((e) => (
          <ExtensionListItem key={e.id} extension={e} reloadExtension={refresh} />
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = () => {
    // Trigger re-fetch by updating refresh trigger
    setRefreshTrigger((prev) => prev + 1);
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
  }, [refreshTrigger]);

  return { extensions: extensions, isLoading, error, refresh };
}
