/**
 * Results view component showing rename operation outcomes
 */

import { useMemo } from "react";
import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { basename, dirname } from "path";
import type { RenameResult } from "../types";

interface ResultsViewProps {
  results: RenameResult[];
  onClose: () => void;
  onUndo: () => Promise<void>;
  onRetryFailed?: () => Promise<void>;
  isLoading?: boolean;
}

export function ResultsView({ results, onClose, onUndo, onRetryFailed, isLoading }: ResultsViewProps) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  const summaryTitle = failCount === 0 ? "Rename Complete" : "Rename Finished with Errors";
  const summarySubtitle =
    failCount === 0
      ? `${successCount} file${successCount !== 1 ? "s" : ""} renamed successfully`
      : `${successCount} succeeded, ${failCount} failed`;

  // Group results by directory for multi-folder visibility
  const groupedResults = useMemo(() => {
    const groups = new Map<string, RenameResult[]>();
    for (const result of results) {
      const dir = dirname(result.oldPath);
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir)!.push(result);
    }
    return groups;
  }, [results]);

  const isMultiDir = groupedResults.size > 1;

  const actions = (
    <ActionPanel>
      <Action title="Close" icon={Icon.XMarkCircle} onAction={onClose} />
      {successCount > 0 && (
        <Action
          title="Undo All"
          icon={Icon.Undo}
          shortcut={{ modifiers: ["cmd"], key: "z" }}
          onAction={async () => {
            let didUndo = false;
            try {
              await onUndo();
              didUndo = true;
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Undo failed",
                message: err instanceof Error ? err.message : String(err),
              });
            }
            if (didUndo) {
              onClose();
            }
          }}
        />
      )}
      {failCount > 0 && onRetryFailed && (
        <Action
          title="Retry Failed"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            try {
              await onRetryFailed();
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Retry failed",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
        />
      )}
    </ActionPanel>
  );

  const renderResultItem = (result: RenameResult, index: number) => (
    <List.Item
      key={`${result.oldPath}-${index}`}
      icon={
        result.success
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      title={basename(result.oldPath)}
      subtitle={result.success ? `→ ${basename(result.newPath)}` : undefined}
      accessories={
        !result.success
          ? [{ text: result.error ?? "Failed", tooltip: result.error ?? "Unknown error" }]
          : [{ icon: { source: Icon.Check, tintColor: Color.Green } }]
      }
      actions={actions}
    />
  );

  return (
    <List navigationTitle="Rename Results" searchBarPlaceholder="Filter results..." isLoading={isLoading}>
      <List.Section title="Summary">
        <List.Item
          icon={
            failCount === 0
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.ExclamationMark, tintColor: Color.Orange }
          }
          title={summaryTitle}
          subtitle={summarySubtitle}
          accessories={[
            { tag: { value: `${successCount} renamed`, color: Color.Green } },
            ...(failCount > 0 ? [{ tag: { value: `${failCount} failed`, color: Color.Red } }] : []),
          ]}
          actions={actions}
        />
      </List.Section>
      {isMultiDir ? (
        [...groupedResults.entries()].map(([dir, dirResults]) => {
          const dirSuccess = dirResults.filter((r) => r.success).length;
          return (
            <List.Section key={dir} title={basename(dir)} subtitle={`${dirSuccess}/${dirResults.length} renamed`}>
              {dirResults.map((result, index) => renderResultItem(result, index))}
            </List.Section>
          );
        })
      ) : (
        <List.Section title="Details">{results.map((result, index) => renderResultItem(result, index))}</List.Section>
      )}
    </List>
  );
}
