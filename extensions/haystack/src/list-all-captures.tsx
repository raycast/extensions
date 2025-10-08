import fs from "node:fs";
import { join } from "node:path";
import { Action, ActionPanel, captureException, environment, Icon, List } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";

import { CaptureDetails } from "./components/capture-details";
import { FILE_NAMES } from "./constants";
import { CaptureSchema } from "./schemas";
import type { Capture } from "./types";
import { deleteCapture } from "./utils/captures";
import { formatDate } from "./utils/date-formatter";

export default function Main(): React.JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [isFileReady, setIsFileReady] = useState(false);

  const capturesPath = join(environment.supportPath, FILE_NAMES.CAPTURES_JSON);

  useEffect(() => {
    if (!fs.existsSync(capturesPath)) {
      try {
        const dir = join(environment.supportPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(capturesPath, JSON.stringify([], null, 2));
      } catch (error) {
        captureException(new Error("Error creating captures.json file: ", { cause: error }));
      }
    }
    setIsFileReady(true);
  }, [capturesPath]);

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

  const fileUrl = `file://${capturesPath}`;

  const { data, isLoading, pagination, mutate } = useStreamJSON(fileUrl, {
    initialData: [] as Capture[],
    pageSize: 20,
    filter: captureFilter,
    transform: captureTransform,
    execute: isFileReady,
  });

  const handleDeleteCapture = useCallback(
    async (captureId: string) => {
      await mutate(deleteCapture(captureId), {
        optimisticUpdate: (currentData) => {
          return currentData.filter((capture) => capture.id !== captureId) as Capture[];
        },
      });
    },
    [mutate],
  );

  return (
    <List isLoading={isLoading || !isFileReady} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="Captures">
        {data.map((capture) => (
          <List.Item
            key={capture.id}
            title={capture.title}
            subtitle={formatDate(capture.createdAt)}
            accessories={[
              {
                tag: capture.stackName,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="See Details" icon={Icon.List} target={<CaptureDetails capture={capture} />} />
                <Action
                  title="Delete Capture"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => handleDeleteCapture(capture.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
