import { join } from "node:path";
import React, { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  confirmAlert,
  environment,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { showFailureToast, usePromise, useStreamJSON } from "@raycast/utils";

import { FILE_NAMES } from "./constants";
import { CaptureSchema } from "./schemas";
import type { Capture } from "./types";
import { deleteCapture, ensureCapturesFileExists } from "./utils/captures";
import { getStacks } from "./utils/stacks";

export default function Main(): React.JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [isFileReady, setIsFileReady] = useState(false);

  const capturesPath = join(environment.supportPath, FILE_NAMES.CAPTURES_JSON);

  // Check if stacks exist
  const { data: stacks, isLoading: isLoadingStacks } = usePromise(async () => {
    try {
      return await getStacks();
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not load stacks" });
      return [];
    }
  }, []);

  useEffect(() => {
    const initFile = async () => {
      try {
        await ensureCapturesFileExists();
      } catch (error) {
        captureException(new Error("Failed to initialize captures file", { cause: error }));
      } finally {
        // Always set file ready even if there's an error, so UI doesn't hang
        setIsFileReady(true);
      }
    };

    initFile();
  }, []);

  const captureFilter = useCallback(
    (item: Capture) => {
      if (!searchText.trim()) return true;

      if (JSON.stringify(item.data).toLowerCase().includes(searchText.toLowerCase())) {
        return true;
      }

      return false;
    },
    [searchText],
  );

  const captureTransform = useCallback((item: unknown): Capture => {
    try {
      const validatedCapture = CaptureSchema.parse(item);

      return validatedCapture;
    } catch (error) {
      captureException(
        new Error(`Invalid capture item: ${error instanceof Error ? error.message : "Unknown validation error"}`),
      );
      throw error;
    }
  }, []);

  const capturePostProcess = useCallback((items: Capture[]): Capture[] => {
    // Safety net: Deduplicate by ID in case old data has duplicates
    // New captures are prevented from creating duplicates at creation time
    const seen = new Map<string, Capture>();
    for (const item of items) {
      seen.set(item.id, item);
    }
    return Array.from(seen.values());
  }, []);

  const fileUrl = `file://${capturesPath}`;

  const {
    data: rawData,
    isLoading,
    pagination,
    mutate,
  } = useStreamJSON(fileUrl, {
    initialData: [] as Capture[],
    pageSize: 20,
    filter: captureFilter,
    transform: captureTransform,
    execute: isFileReady,
  });

  // Deduplicate captures (safety net for old data)
  const data = capturePostProcess(rawData);

  const handleDeleteCapture = useCallback(
    async (captureId: string, title: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Capture",
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      await mutate(deleteCapture(captureId), {
        optimisticUpdate: (currentData) => {
          return currentData.filter((capture) => capture.id !== captureId) as Capture[];
        },
      });
    },
    [mutate],
  );

  const handleCreateStack = async () => {
    try {
      await launchCommand({ name: "create-new-stack", type: LaunchType.UserInitiated });
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not open Create New Stack command" });
    }
  };

  const handleCreateCapture = async () => {
    try {
      await launchCommand({ name: "create-new-capture", type: LaunchType.UserInitiated });
    } catch (error) {
      captureException(error);
      await showFailureToast(error, { title: "Could not open Create New Capture command" });
    }
  };

  const hasStacks = (stacks?.length ?? 0) > 0;
  const hasCaptures = data.length > 0;

  return (
    <List
      isLoading={isLoading || isLoadingStacks || !isFileReady}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      isShowingDetail={hasCaptures}
    >
      {!hasStacks ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Stacks Found"
          description="Create your first stack before you can start capturing"
          actions={
            <ActionPanel>
              <Action title="Create New Stack" icon={Icon.PlusSquare} onAction={handleCreateStack} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Camera}
          title="No Captures Yet"
          description="Create your first capture to start organizing screenshots"
          actions={
            <ActionPanel>
              <Action title="Create New Capture" icon={Icon.Camera} onAction={handleCreateCapture} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Captures">
        {data.map((capture) => {
          const createdAt = new Date(capture.createdAt);
          return (
            <List.Item
              key={capture.id}
              title={capture.title}
              accessories={[
                {
                  date: createdAt,
                  tooltip: createdAt.toLocaleString(),
                },
              ]}
              quickLook={{ path: capture.imagePath, name: capture.title }}
              detail={
                <List.Item.Detail
                  markdown={`![Screenshot](file://${encodeURI(capture.imagePath)}?raycast-height=187)`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(capture.data).map(([key, { value }]) => (
                        <List.Item.Detail.Metadata.Label key={key} title={key} text={value || "—"} />
                      ))}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Stack" text={capture.stack.name} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.ToggleQuickLook />
                  <Action
                    title="Delete Capture"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDeleteCapture(capture.id, capture.title)}
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
