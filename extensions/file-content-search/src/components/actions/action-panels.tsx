import { ActionPanel } from "@raycast/api";
import type { FC } from "react";
import type { Config, GrepEntry } from "../../types";
import {
  ChangeDirectoryAction,
  ChangeMaxResultsAction,
  ChangeTimeoutAction,
  ClearAllHistoryAction,
  CopyLineContentAction,
  CopyMatchWithContextAction,
  CopyPathAction,
  CopyPatternAction,
  OpenContainingFolderAction,
  OpenFileAction,
  OpenInVSCodeAction,
  OpenInXcodeAction,
  RemoveFromHistoryAction,
  ReplaceInFileAction,
  ResetDirectoryAction,
  SearchAgainAction,
  ShowInFinderAction,
  ToggleRegexAction,
} from "./actions";

// ============================================================================
// Types
// ============================================================================

type SearchConfigProps = {
  config: Config;
  onConfigChange: (config: Partial<Config>) => void;
};

type GrepEntryActionProps = SearchConfigProps & {
  entry: GrepEntry;
};

type HistoryItemProps = {
  pattern: string;
  onSelect: (pattern: string) => void;
  onRemove: (pattern: string) => void;
  onClear: () => void;
};

// ============================================================================
// Action Panels
// ============================================================================

export const EmptyViewActionPanel: FC<SearchConfigProps> = ({ config, onConfigChange }) => (
  <ActionPanel>
    <ActionPanel.Section title="Search Directory">
      <ChangeDirectoryAction
        path={config.searchPath}
        value={config.searchPath}
        onAction={(p) => onConfigChange({ searchPath: p })}
      />
      <ResetDirectoryAction
        path={config.searchPath}
        value={config.searchPath}
        onAction={(p) => onConfigChange({ searchPath: p })}
      />
    </ActionPanel.Section>
    <ActionPanel.Section title="Search Settings">
      <ToggleRegexAction
        useRegex={config.useRegex}
        value={config.useRegex}
        onAction={(v) => onConfigChange({ useRegex: v })}
      />
      <ChangeTimeoutAction
        timeout={config.timeout}
        value={config.timeout}
        onAction={(t) => onConfigChange({ timeout: t })}
      />
      <ChangeMaxResultsAction
        maxResults={config.maxResults}
        value={config.maxResults}
        onAction={(m) => onConfigChange({ maxResults: m })}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

export const GrepResultActionPanel: FC<GrepEntryActionProps> = ({
  entry,
  config,
  onConfigChange,
}) => (
  <ActionPanel>
    <ActionPanel.Section title="File Actions">
      <OpenFileAction path={entry.path} />
      <OpenInVSCodeAction path={entry.path} line={entry.line} />
      <OpenInXcodeAction path={entry.path} line={entry.line} />
      <ShowInFinderAction path={entry.path} />
      <OpenContainingFolderAction path={entry.path} />
    </ActionPanel.Section>
    <ActionPanel.Section title="Match Actions">
      <CopyLineContentAction path={entry.path} line={entry.line} content={entry.content} />
      <CopyMatchWithContextAction path={entry.path} line={entry.line} content={entry.content} />
      <ReplaceInFileAction path={entry.path} line={entry.line} content={entry.content} />
      <CopyPathAction path={entry.path} />
    </ActionPanel.Section>
    <ActionPanel.Section title="Search Directory">
      <ChangeDirectoryAction
        path={config.searchPath}
        value={config.searchPath}
        onAction={(p) => onConfigChange({ searchPath: p })}
      />
      <ResetDirectoryAction
        path={config.searchPath}
        value={config.searchPath}
        onAction={(p) => onConfigChange({ searchPath: p })}
      />
    </ActionPanel.Section>
    <ActionPanel.Section title="Search Settings">
      <ToggleRegexAction
        useRegex={config.useRegex}
        value={config.useRegex}
        onAction={(v) => onConfigChange({ useRegex: v })}
      />
      <ChangeTimeoutAction
        timeout={config.timeout}
        value={config.timeout}
        onAction={(t) => onConfigChange({ timeout: t })}
      />
      <ChangeMaxResultsAction
        maxResults={config.maxResults}
        value={config.maxResults}
        onAction={(m) => onConfigChange({ maxResults: m })}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

export const HistoryActionPanel: FC<HistoryItemProps> = ({
  pattern,
  onSelect,
  onRemove,
  onClear,
}) => (
  <ActionPanel>
    <ActionPanel.Section title="Pattern Actions">
      <SearchAgainAction pattern={pattern} value={pattern} onAction={onSelect} />
      <CopyPatternAction pattern={pattern} />
    </ActionPanel.Section>
    <ActionPanel.Section title="History">
      <RemoveFromHistoryAction pattern={pattern} value={pattern} onAction={onRemove} />
      <ClearAllHistoryAction onAction={onClear} />
    </ActionPanel.Section>
  </ActionPanel>
);
