import { exec } from "node:child_process";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { Action, Icon, showToast, Toast } from "@raycast/api";
import type { FC } from "react";
import { DirectoryPickerForm, MaxResultsForm, ReplaceForm, TimeoutForm } from "../forms";

// ============================================================================
// Generic Action Props
// ============================================================================

/** Generic props for actions with a callback */
type ActionProps<T> = {
  value: T;
  onAction: (value: T) => void;
};

/** Props for file-based actions */
type FilePathProps = {
  path: string;
};

/** Props for actions that operate on a specific match in a file */
type MatchLocationProps = {
  path: string;
  line: number;
  content: string;
};

/** Props for editor actions (file + line) */
type EditorActionProps = {
  path: string;
  line: number;
};

// ============================================================================
// File Actions
// ============================================================================

export const OpenFileAction: FC<FilePathProps> = ({ path }) => (
  <Action.Open title="Open File" target={path} />
);

export const ShowInFinderAction: FC<FilePathProps> = ({ path }) => (
  <Action.ShowInFinder path={path} />
);

export const OpenContainingFolderAction: FC<FilePathProps> = ({ path }) => (
  <Action.ShowInFinder title="Open Containing Folder" path={dirname(path)} />
);

export const CopyPathAction: FC<FilePathProps> = ({ path }) => (
  <Action.CopyToClipboard
    title="Copy Path"
    content={path}
    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
  />
);

// ============================================================================
// Editor Actions
// ============================================================================

export const OpenInXcodeAction: FC<EditorActionProps> = ({ path, line }) => (
  <Action
    title="Open in Xcode"
    icon={Icon.Code}
    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
    onAction={() => {
      exec(`xed --line ${line} "${path}"`, (error) => {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Xcode not found",
            message: "Make sure Xcode is installed",
          });
        }
      });
    }}
  />
);

export const OpenInVSCodeAction: FC<EditorActionProps> = ({ path, line }) => (
  <Action
    title="Open in VS Code"
    icon={Icon.Code}
    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    onAction={() => {
      exec(`code --goto "${path}:${line}"`, (error) => {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "VS Code not found",
            message: "Make sure VS Code is installed and 'code' command is in PATH",
          });
        }
      });
    }}
  />
);

// ============================================================================
// Directory Actions
// ============================================================================

type DirectoryActionProps = ActionProps<string> & { path: string };

export const ChangeDirectoryAction: FC<DirectoryActionProps> = ({ path, onAction }) => (
  <Action.Push
    title="Change Search Directory…"
    icon={Icon.Folder}
    shortcut={{ modifiers: ["cmd"], key: "l" }}
    target={<DirectoryPickerForm path={path} onAction={onAction} />}
  />
);

export const ResetDirectoryAction: FC<DirectoryActionProps> = ({ path, onAction }) => {
  const HOME_DIR = homedir();

  if (path === HOME_DIR) {
    return null;
  }

  return (
    <Action
      title="Reset to Home (~)"
      icon={Icon.House}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      onAction={() => onAction(HOME_DIR)}
    />
  );
};

// ============================================================================
// Search Settings Actions
// ============================================================================

type ToggleRegexActionProps = ActionProps<boolean> & { useRegex: boolean };

export const ToggleRegexAction: FC<ToggleRegexActionProps> = ({ useRegex, onAction }) => (
  <Action
    title={useRegex ? "Disable Regex" : "Enable Regex"}
    icon={useRegex ? Icon.CheckCircle : Icon.Code}
    shortcut={{ modifiers: ["cmd"], key: "r" }}
    onAction={() => onAction(!useRegex)}
  />
);

type TimeoutActionProps = ActionProps<number> & { timeout: number };

export const ChangeTimeoutAction: FC<TimeoutActionProps> = ({ timeout, onAction }) => (
  <Action.Push
    title="Change Timeout…"
    icon={Icon.Clock}
    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
    target={<TimeoutForm timeout={timeout} onAction={onAction} />}
  />
);

type MaxResultsActionProps = ActionProps<number> & { maxResults: number };

export const ChangeMaxResultsAction: FC<MaxResultsActionProps> = ({ maxResults, onAction }) => (
  <Action.Push
    title="Change Max Results…"
    icon={Icon.List}
    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
    target={<MaxResultsForm maxResults={maxResults} onAction={onAction} />}
  />
);

// ============================================================================
// Match Actions
// ============================================================================

export const CopyMatchWithContextAction: FC<MatchLocationProps> = ({ path, line, content }) => (
  <Action.CopyToClipboard
    title="Copy Match with Context"
    icon={Icon.Clipboard}
    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
    content={`${path}:${line}\n${content}`}
  />
);

export const CopyLineContentAction: FC<MatchLocationProps> = ({ content }) => (
  <Action.CopyToClipboard
    title="Copy Line Content"
    icon={Icon.Text}
    shortcut={{ modifiers: ["cmd"], key: "." }}
    content={content}
  />
);

export const ReplaceInFileAction: FC<MatchLocationProps> = ({ path, line, content }) => (
  <Action.Push
    title="Replace in File…"
    icon={Icon.Pencil}
    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    target={<ReplaceForm path={path} line={line} content={content} />}
  />
);

// ============================================================================
// History Actions
// ============================================================================

type PatternActionProps = ActionProps<string> & { pattern: string };

export const SearchAgainAction: FC<PatternActionProps> = ({ pattern, onAction }) => (
  <Action title="Search Again" icon={Icon.MagnifyingGlass} onAction={() => onAction(pattern)} />
);

type PatternProps = {
  pattern: string;
};

export const CopyPatternAction: FC<PatternProps> = ({ pattern }) => (
  <Action.CopyToClipboard
    title="Copy Pattern"
    content={pattern}
    shortcut={{ modifiers: ["cmd"], key: "c" }}
  />
);

export const RemoveFromHistoryAction: FC<PatternActionProps> = ({ pattern, onAction }) => (
  <Action
    title="Remove from History"
    icon={Icon.Trash}
    style={Action.Style.Destructive}
    shortcut={{ modifiers: ["cmd"], key: "d" }}
    onAction={() => onAction(pattern)}
  />
);

type VoidActionProps = {
  onAction: () => void;
};

export const ClearAllHistoryAction: FC<VoidActionProps> = ({ onAction }) => (
  <Action
    title="Clear All History"
    icon={Icon.XMarkCircle}
    style={Action.Style.Destructive}
    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
    onAction={onAction}
  />
);
