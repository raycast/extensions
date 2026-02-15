import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  openExtensionPreferences,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import path from "node:path";
import { appendTextToFile, createAppendOptions } from "../lib/append";
import { type AppendRequest } from "../lib/append-request";
import { type AppendStyle } from "../lib/formatting";
import {
  findCandidateFiles,
  getCachedCandidateFiles,
} from "../lib/file-search";
import { getResolvedPreferences } from "../lib/preferences";

interface FilePickerProps {
  request: AppendRequest;
  navigationTitle?: string;
}

export function FilePicker(props: FilePickerProps) {
  const preferences = getResolvedPreferences();
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const searchOptions = useMemo(
    () => ({
      roots: preferences.roots,
      allowedExtensions: preferences.allowedExtensions,
      searchExcludes: preferences.searchExcludes,
      searchMaxDepth: preferences.searchMaxDepth,
    }),
    [
      preferences.allowedExtensions,
      preferences.roots,
      preferences.searchExcludes,
      preferences.searchMaxDepth,
    ],
  );

  const refreshFiles = useCallback(
    async (mode: "foreground" | "background" = "foreground") => {
      if (mode === "foreground") {
        setIsLoadingFiles(true);
      }
      setErrorMessage(undefined);

      try {
        const discovered = await findCandidateFiles(searchOptions);
        setFiles(discovered);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to search files.";
        setErrorMessage(message);
        if (mode === "foreground") {
          setFiles([]);
        }

        if (mode !== "background") {
          await showToast({
            style: Toast.Style.Failure,
            title: "File search failed",
            message,
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: () => {
                void openExtensionPreferences();
              },
            },
          });
        }
      } finally {
        if (mode === "foreground") {
          setIsLoadingFiles(false);
        }
      }
    },
    [searchOptions],
  );

  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    setErrorMessage(undefined);

    const cached = await getCachedCandidateFiles(searchOptions);
    if (cached && cached.length > 0) {
      setFiles(cached);
      setIsLoadingFiles(false);
      void refreshFiles("background");
      return;
    }

    await refreshFiles("foreground");
  }, [refreshFiles, searchOptions]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const detailMarkdown = useMemo(() => {
    if (!props.request.text) {
      return "No text available to append.";
    }

    return `## Clipboard Snippet\n\n${props.request.snippet || "(empty)"}`;
  }, [props.request.snippet, props.request.text]);

  const appendToPath = useCallback(
    async (filePath: string, style: AppendStyle) => {
      try {
        await appendTextToFile(
          filePath,
          props.request.text,
          createAppendOptions(preferences, style, props.request.insertPosition),
        );

        await showHUD(`Appended to ${path.basename(filePath)}`);
        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Append failed.";
        const blockedByPolicy = message.includes("Blocked by extension filter");
        await showToast({
          style: Toast.Style.Failure,
          title: "Append failed",
          message,
          primaryAction: blockedByPolicy
            ? {
                title: "Open Extension Preferences",
                onAction: () => {
                  void openExtensionPreferences();
                },
              }
            : undefined,
        });
      }
    },
    [preferences, props.request.insertPosition, props.request.text],
  );

  const renderActions = (filePath: string) => (
    <ActionPanel>
      <ActionPanel.Section title="Append">
        <Action
          title="Append Raw"
          onAction={() => void appendToPath(filePath, "raw")}
        />
        <Action
          title="Append as Bullet"
          onAction={() => void appendToPath(filePath, "bullet")}
        />
        <Action
          title="Append as Markdown Quote"
          onAction={() => void appendToPath(filePath, "quote")}
        />
        <Action
          title="Append with Timestamp"
          onAction={() => void appendToPath(filePath, "timestamp")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh Files"
          icon={Icon.ArrowClockwise}
          onAction={() => void refreshFiles("foreground")}
        />
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={() => {
            void openExtensionPreferences();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoadingFiles}
      isShowingDetail
      navigationTitle={props.navigationTitle ?? "Append to File"}
    >
      {files.map((filePath) => (
        <List.Item
          key={filePath}
          title={path.basename(filePath)}
          subtitle={path.dirname(filePath)}
          detail={
            <List.Item.Detail
              markdown={detailMarkdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="File"
                    text={filePath}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Clipboard"
                    text={props.request.snippet || "(empty)"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={renderActions(filePath)}
        />
      ))}
      {!isLoadingFiles && files.length === 0 ? (
        <List.EmptyView
          title="No matching files"
          description={
            errorMessage ?? "No files found under configured roots/extensions."
          }
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Files"
                icon={Icon.ArrowClockwise}
                onAction={() => void refreshFiles("foreground")}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  void openExtensionPreferences();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
