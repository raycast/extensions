import { Action, ActionPanel, clearSearchBar, Color, Icon, List } from "@raycast/api";
import React, { useEffect } from "react";
import { exportClipboard, exportPaste } from "./clipboard";
import { useGitignore, useListDetailPreference } from "./hooks";
import GitignorePreview from "./preview";
import { GitignoreFile } from "./types";

function GitignoreList({
  gitignoreFiles,
  selected,
  toggleSelection,
}: {
  gitignoreFiles: GitignoreFile[];
  selected: boolean;
  toggleSelection: (gitignoreFile: GitignoreFile) => void;
}) {
  const listDetail = useListDetailPreference();

  return (
    <React.Fragment>
      {gitignoreFiles.map((gitignore) => {
        const keywords = gitignore.folder !== undefined ? [gitignore.folder] : undefined;
        return (
          <List.Item
            key={gitignore.path}
            id={gitignore.path}
            icon={selected ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
            title={gitignore.name}
            keywords={keywords}
            accessoryTitle={gitignore.folder}
            detail={listDetail && <GitignorePreview gitignoreFiles={[gitignore]} listPreview />}
            actions={
              <ActionPanel>
                <Action
                  title={selected ? "Deselect" : "Select"}
                  icon={selected ? Icon.Circle : Icon.Checkmark}
                  onAction={() => {
                    toggleSelection(gitignore);
                  }}
                />
                <CopyToClipboardAction selected={[gitignore]} />
                <PasteAction selected={[gitignore]} />
                <PreviewAction selected={[gitignore]} />
              </ActionPanel>
            }
          />
        );
      })}
    </React.Fragment>
  );
}

export default function Gitignore() {
  const [{ gitignoreFiles, lastUpdated, loading }, selectedIds, toggleSelection, refresh] = useGitignore();

  useEffect(() => {
    clearSearchBar({ forceScrollToTop: false });
  }, [selectedIds]);

  const listDetail = useListDetailPreference();

  const selected = gitignoreFiles.filter((gitignoreFile) => selectedIds.has(gitignoreFile.id));
  const unselected = gitignoreFiles.filter((gitignoreFile) => !selectedIds.has(gitignoreFile.id));

  const lastUpdatedSubtitle = lastUpdated != null ? `Last updated ${lastUpdated.toLocaleString()}` : "";

  return (
    <List isLoading={loading} isShowingDetail={listDetail}>
      <List.Section>
        {selected.length > 0 ? (
          <List.Item
            icon={Icon.Document}
            title="Create .gitignore"
            detail={listDetail && <GitignorePreview gitignoreFiles={selected} listPreview />}
            actions={
              <ActionPanel>
                <CopyToClipboardAction selected={selected} />
                <PasteAction selected={selected} />
                <PreviewAction selected={selected} />
              </ActionPanel>
            }
          />
        ) : (
          !loading && (
            <List.Item
              icon={Icon.Download}
              title="Refresh"
              subtitle={!listDetail ? lastUpdatedSubtitle : undefined}
              detail={listDetail && <List.Item.Detail markdown={`### ${lastUpdatedSubtitle}`} />}
              actions={
                <ActionPanel>
                  <Action title="Refresh" onAction={refresh} />
                </ActionPanel>
              }
            />
          )
        )}
      </List.Section>
      {/* Render selected files */}
      {selected && (
        <List.Section title="Selected">
          <GitignoreList gitignoreFiles={selected} selected={true} toggleSelection={toggleSelection} />
        </List.Section>
      )}
      {/* Render unselected files */}
      {unselected && (
        <List.Section title="Available">
          <GitignoreList gitignoreFiles={unselected} selected={false} toggleSelection={toggleSelection} />
        </List.Section>
      )}
    </List>
  );
}

function PreviewAction({ selected }: { selected: GitignoreFile[] }) {
  return (
    <Action.Push
      title="Preview"
      icon={Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      target={<GitignorePreview gitignoreFiles={selected} />}
    />
  );
}

function PasteAction({ selected }: { selected: GitignoreFile[] }) {
  return (
    <Action
      title="Paste to App"
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      icon={Icon.TextDocument}
      onAction={() => exportPaste(selected)}
    />
  );
}

function CopyToClipboardAction({ selected }: { selected: GitignoreFile[] }) {
  return <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard(selected)} />;
}
