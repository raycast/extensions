import { Action, ActionPanel, Color, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import EmailList from "./components/EmailList";
import ErrorView from "./components/ErrorView";
import { folderRows, sectionId, sectionSubtitle, sectionTitle } from "./lib/folders";
import { SparkIconName, actionIcon, sparkIcon } from "./lib/sparkIcons";
import { sparkJSON } from "./lib/spark";
import { FoldersResult } from "./lib/types";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

/// Every folder and label Spark has, grouped like its sidebar: the unified
/// folders, then each account and shared inbox. Opening one lists its emails.
function Command() {
  const [scope, setScope] = useCachedState("folders-scope", "all");
  const { data, isLoading, error, revalidate } = usePromise(() => sparkJSON<FoldersResult>(["folders"]), [], {
    onError: () => undefined,
  });
  const sections = data?.sections ?? [];
  const shown = scope === "all" ? sections : sections.filter((s) => sectionId(s) === scope);

  useRefreshNotice(error, sections.length > 0, revalidate);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter folders"
      searchBarAccessory={
        <List.Dropdown tooltip="Account" value={scope} onChange={setScope}>
          <List.Dropdown.Item value="all" title="All Accounts and Folders" />
          {sections.map((section) => (
            <List.Dropdown.Item
              key={sectionId(section)}
              value={sectionId(section)}
              title={section.kind === "unified" ? "Unified Folders" : sectionTitle(section)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={sparkIcon("Folder", Color.SecondaryText)} title="No folders" />
      )}
      {shown.map((section) => (
        <List.Section key={sectionId(section)} title={sectionTitle(section)} subtitle={sectionSubtitle(section)}>
          {folderRows(section).map((folder) => (
            <List.Item
              key={folder.identifier}
              icon={sparkIcon(folder.icon as SparkIconName, Color.SecondaryText)}
              title={folder.name}
              keywords={[sectionTitle(section), folder.identifier]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Folder"
                    icon={actionIcon(folder.icon as SparkIconName)}
                    target={
                      <EmailList
                        args={["emails", folder.identifier]}
                        navigationTitle={
                          section.kind === "unified" ? folder.name : `${folder.name} — ${sectionTitle(section)}`
                        }
                        emptyTitle={`No emails in ${folder.name}`}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Folder Identifier"
                    content={folder.identifier}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default withSparkCLI(Command);
