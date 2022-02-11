import { Action, ActionPanel, clearSearchBar, Color, Icon, Image, List } from "@raycast/api";
import React from "react";
import { exportClipboard } from "./clipboard";
import { useGitignore } from "./hooks";
import { GitignoreFile } from "./types";

/**
 * Generate list of Gitignore files with provided icon
 */
function GitignoreList({
  gitignoreFiles,
  selected,
  toggleSelection,
}: {
  gitignoreFiles: GitignoreFile[];
  selected: boolean;
  toggleSelection: (gitignoreFile: GitignoreFile) => void;
}) {
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
            actions={
              <ActionPanel>
                <Action
                  title={selected ? "Deselect" : "Select"}
                  icon={selected ? Icon.Circle : Icon.Checkmark}
                  onAction={() => {
                    clearSearchBar();
                    toggleSelection(gitignore);
                  }}
                />
                <Action
                  title="Copy Contents to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => exportClipboard([gitignore])}
                />
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

  const selected = gitignoreFiles.filter((gitignoreFile) => selectedIds.has(gitignoreFile.id));
  const unselected = gitignoreFiles.filter((gitignoreFile) => !selectedIds.has(gitignoreFile.id));

  return (
    <List isLoading={loading}>
      <List.Section>
        {selected.length > 0 ? (
          <List.Item
            icon={Icon.Clipboard}
            title="Generate and Copy to Clipboard"
            actions={
              <ActionPanel>
                <Action
                  title="Generate and Copy to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => exportClipboard(selected)}
                />
              </ActionPanel>
            }
          />
        ) : (
          !loading && (
            <List.Item
              icon={Icon.Download}
              title="Refresh"
              subtitle={lastUpdated != null ? `Last updated ${lastUpdated.toLocaleString()}` : undefined}
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
