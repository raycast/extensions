/**
 * AI Smart Rename Command
 *
 * Uses AI to generate descriptive filenames based on file metadata.
 * Requires Raycast Pro subscription.
 */

import { useEffect, useState, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color,
} from "@raycast/api";
import { dirname, basename, join } from "path";
import { useSelectedFiles } from "../hooks/use-selected-files";
import { useAISuggestions } from "../hooks/use-ai-suggestions";
import { checkConflicts } from "../lib/files";
import { saveToHistory, undoLastRename } from "../lib/history";
import { withProgress } from "../lib/progress";
import { getFileTypeIcon } from "../lib/file-types";
import { buildAutoSummary } from "../lib/selection-summary";
import { UndoAction } from "../components/undo-action";
import { FileSelectionForm } from "../components/file-selection-form";
import { ResultsView } from "../components/results-view";
import { getUserFriendlyErrorMessage } from "../lib/errors";
import { getFileMetadata } from "../lib/metadata";
import { toFileMetadataContext } from "../lib/metadata/convert";
import { log } from "../lib/logger";
import { SelectionMode, type RenameOperation, type RenameResult, type FileMetadataContext } from "../types";

export default function AISuggestCommand({ mode = SelectionMode.FILES }: { mode?: SelectionMode }) {
  const { files, isLoading: filesLoading, noFilesSelected, setFiles } = useSelectedFiles(mode);
  const [operationResults, setOperationResults] = useState<RenameResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadataMap, setMetadataMap] = useState<Map<string, FileMetadataContext>>(new Map());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  // Load metadata for all files
  useEffect(() => {
    let cancelled = false;

    async function loadAllMetadata() {
      const newMap = new Map<string, FileMetadataContext>();
      const BATCH_SIZE = 5;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = files.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const metadata = await getFileMetadata(file.path);
            const context = toFileMetadataContext(metadata);
            return { path: file.path, context };
          }),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.context) {
            newMap.set(result.value.path, result.value.context);
          }
        }
      }

      if (!cancelled) {
        log.metadata.info(`Loaded metadata for ${newMap.size}/${files.length} files`);
        setMetadataMap(newMap);
      }
    }

    if (files.length > 0) {
      loadAllMetadata();
    }

    return () => {
      cancelled = true;
    };
  }, [files]);

  const {
    suggestions,
    isLoading: aiLoading,
    isAIAvailable: aiAvailable,
    generateAll,
    generateOne,
  } = useAISuggestions({
    files,
    metadata: metadataMap,
  });

  const handleGenerateAll = useCallback(async () => {
    await generateAll();
  }, [generateAll]);

  const handleAccept = useCallback((filePath: string) => {
    setAcceptedSuggestions((prev) => new Set([...prev, filePath]));
  }, []);

  const handleReject = useCallback((filePath: string) => {
    setAcceptedSuggestions((prev) => {
      const next = new Set(prev);
      next.delete(filePath);
      return next;
    });
  }, []);

  const handleAcceptAll = useCallback(() => {
    const validSuggestions = suggestions.filter((s) => s.status === "success" && s.suggestedName);
    setAcceptedSuggestions(new Set(validSuggestions.map((s) => s.filePath)));
  }, [suggestions]);

  const renameAccepted = async () => {
    const toRename = suggestions.filter(
      (s) => acceptedSuggestions.has(s.filePath) && s.status === "success" && s.suggestedName,
    );

    if (toRename.length === 0) {
      await showToast({
        style: Toast.Style.Animated,
        title: "No suggestions accepted",
        message: "Accept some suggestions first",
      });
      return;
    }

    // Find original file info for extension
    const fileMap = new Map(files.map((f) => [f.path, f]));

    const operations: RenameOperation[] = toRename
      .filter((suggestion) => fileMap.has(suggestion.filePath))
      .map((suggestion) => {
        const file = fileMap.get(suggestion.filePath)!;
        const newName = file.extension ? `${suggestion.suggestedName}${file.extension}` : suggestion.suggestedName;
        return {
          oldPath: suggestion.filePath,
          newName,
          newPath: join(dirname(suggestion.filePath), newName),
        };
      });

    // Check for conflicts
    const conflicts = await checkConflicts(operations);
    if (conflicts.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conflicts detected",
        message: conflicts.slice(0, 3).join("; "),
      });
      return;
    }

    // Confirm
    if (toRename.length > 1) {
      const previewText = toRename
        .slice(0, 5)
        .map((s) => `${s.originalName} → ${s.suggestedName}`)
        .join("\n");

      const confirmed = await confirmAlert({
        title: `Rename ${toRename.length} Files?`,
        message: previewText,
        primaryAction: {
          title: "Rename All",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;
    }

    setIsProcessing(true);

    try {
      const itemLabel = mode === "folders" ? "folder" : "file";
      const description =
        toRename.length === 1
          ? `AI renamed "${basename(toRename[0]?.filePath ?? "")}"`
          : `AI renamed ${operations.length} ${itemLabel}s`;

      const result = await withProgress(operations, {
        actionName: "Renaming",
        itemLabel,
      });

      if (result.successfulOps.length > 0) {
        await saveToHistory(description, result.successfulOps);
      }

      setOperationResults(result.results);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    await closeMainWindow();
    await popToRoot();
  };

  const handleUndo = async () => {
    try {
      await undoLastRename();
    } catch (err) {
      log.metadata.error("Undo failed", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo failed",
        message: getUserFriendlyErrorMessage(err),
      });
    }
  };

  // Show file picker when no files are selected
  if (noFilesSelected && files.length === 0) {
    return <FileSelectionForm onFilesSelected={setFiles} mode={mode} />;
  }

  // Check AI availability
  if (!aiAvailable) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="AI Not Available"
          description="AI Smart Rename requires a Raycast Pro subscription. Please upgrade to use this feature."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Learn About Raycast Pro" url="https://raycast.com/pro" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show results view after operation completes
  if (operationResults) {
    return (
      <ResultsView results={operationResults} onClose={handleClose} onUndo={handleUndo} isLoading={isProcessing} />
    );
  }

  const acceptedCount = acceptedSuggestions.size;
  const successCount = suggestions.filter((s) => s.status === "success").length;
  const loadingCount = suggestions.filter((s) => s.status === "loading").length;

  return (
    <List
      isLoading={filesLoading || aiLoading || isProcessing}
      navigationTitle="AI Smart Rename"
      searchBarPlaceholder="Filter files..."
      actions={
        <ActionPanel>
          {acceptedCount > 0 && (
            <Action title={`Rename ${acceptedCount} Files`} icon={Icon.Pencil} onAction={renameAccepted} />
          )}
          <Action
            title="Generate All Suggestions"
            icon={Icon.Stars}
            onAction={handleGenerateAll}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          {successCount > 0 && (
            <Action
              title="Accept All Suggestions"
              icon={Icon.CheckCircle}
              onAction={handleAcceptAll}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          )}
          <UndoAction />
        </ActionPanel>
      }
    >
      {/* Status Section */}
      <List.Section title="Status">
        <List.Item
          title={
            loadingCount > 0
              ? `Generating suggestions... (${loadingCount} remaining)`
              : successCount > 0
                ? `${successCount} suggestions ready, ${acceptedCount} accepted`
                : "Press ⌘G to generate suggestions"
          }
          icon={
            loadingCount > 0
              ? Icon.CircleProgress
              : successCount > 0
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Stars
          }
          actions={
            <ActionPanel>
              <Action
                title="Generate All Suggestions"
                icon={Icon.Stars}
                onAction={handleGenerateAll}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Suggestions Section */}
      <List.Section title="Files" subtitle={buildAutoSummary(files)}>
        {suggestions.map((suggestion) => {
          const file = files.find((f) => f.path === suggestion.filePath);
          if (!file) return null;

          const isAccepted = acceptedSuggestions.has(suggestion.filePath);
          const icon = getFileTypeIcon(file.extension);

          return (
            <List.Item
              key={suggestion.filePath}
              title={
                suggestion.status === "success" && suggestion.suggestedName
                  ? suggestion.suggestedName
                  : suggestion.originalName
              }
              subtitle={
                suggestion.status === "success" && suggestion.suggestedName
                  ? `← ${suggestion.originalName}`
                  : suggestion.status === "loading"
                    ? "Generating..."
                    : suggestion.status === "error"
                      ? suggestion.error || "Error"
                      : "Pending"
              }
              icon={icon}
              accessories={[
                suggestion.status === "loading"
                  ? { icon: Icon.CircleProgress }
                  : suggestion.status === "error"
                    ? { icon: { source: Icon.XMarkCircle, tintColor: Color.Red } }
                    : suggestion.status === "success"
                      ? isAccepted
                        ? {
                            icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                            tooltip: "Accepted",
                          }
                        : {
                            icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
                            tooltip: "Click to accept",
                          }
                      : { icon: Icon.Minus },
              ]}
              actions={
                <ActionPanel>
                  {suggestion.status === "success" && suggestion.suggestedName && (
                    <>
                      {isAccepted ? (
                        <Action
                          title="Reject Suggestion"
                          icon={Icon.XMarkCircle}
                          onAction={() => handleReject(suggestion.filePath)}
                        />
                      ) : (
                        <Action
                          title="Accept Suggestion"
                          icon={Icon.CheckCircle}
                          onAction={() => handleAccept(suggestion.filePath)}
                        />
                      )}
                    </>
                  )}
                  <Action
                    title="Regenerate"
                    icon={Icon.RotateClockwise}
                    onAction={() => generateOne(suggestion.filePath)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Generate All"
                    icon={Icon.Stars}
                    onAction={handleGenerateAll}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
