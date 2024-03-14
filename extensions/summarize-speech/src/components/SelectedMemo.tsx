import React, { useState } from "react";
import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { SelectedMemoProps, SummaryType } from "../interfaces";
import SummaryView from "./SummaryView";
import { CustomSummaryInput } from "./CustomSummaryInput";

const SUMMARY_TYPES: SummaryType[] = [
  { value: "1-1", label: "1-1 Transcript" },
  { value: "slack", label: "Slack Post Response" },
  { value: "thoughts", label: "Structuring Thoughts" },
  { value: "custom", label: "Custom Prompt" },
];

export const SelectedMemo: React.FC<SelectedMemoProps> = ({ selectedMemo, cache }) => {
  const [showTimestamps, setShowTimestamps] = useState(false);
  const { push } = useNavigation();

  const toggleTimestamps = () => {
    if (showTimestamps) {
      setShowTimestamps(false);
    } else {
      setShowTimestamps(true);
    }
  };

  const transcriptFormatted =
    cache && cache.transcriptionResult
      ? showTimestamps
        ? cache.transcriptionResult.timestamps
        : cache.transcriptionResult.noTimestamps
      : "";
  const transcriptWithTitle = `# ${cache?.title}\n\n${transcriptFormatted}`;

  return (
    <List isShowingDetail>
      <List.Section title="Summary Types">
        {SUMMARY_TYPES.map((summaryType) => (
          <List.Item
            key={summaryType.value}
            title={summaryType.label}
            detail={<List.Item.Detail markdown={transcriptWithTitle} />}
            actions={
              <ActionPanel>
                {summaryType.value === "custom" ? (
                  <Action
                    title="Enter Custom Prompt"
                    onAction={() =>
                      push(
                        <CustomSummaryInput
                          text={transcriptFormatted}
                          summaryType={summaryType}
                          cache={cache}
                          selectedMemo={selectedMemo}
                          showTimestamps={showTimestamps}
                        />,
                      )
                    }
                  />
                ) : (
                  <Action
                    title="Generate Summary"
                    onAction={() =>
                      push(
                        <SummaryView
                          summaryType={summaryType}
                          cache={cache}
                          selectedMemo={selectedMemo}
                          showTimestamps={showTimestamps}
                        />,
                      )
                    }
                  />
                )}
                <Action
                  title="Toggle Timestamps"
                  onAction={toggleTimestamps}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
