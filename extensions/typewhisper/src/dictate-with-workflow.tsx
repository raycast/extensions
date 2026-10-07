import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import {
  errorMessage,
  getAuthHeaders,
  parseApiResponse,
  getBaseUrl,
} from "./api";
import {
  RunningDictationSection,
  useDictationStatus,
} from "./running-dictation";
import type { WorkflowsResponse } from "./types";
import { startDictationWithWorkflow } from "./workflow-dictation";

export default function Command() {
  const { isLoading, data } = useFetch<WorkflowsResponse>(
    `${getBaseUrl()}/v1/rules`,
    {
      headers: getAuthHeaders(),
      parseResponse: parseApiResponse,
      keepPreviousData: true,
    },
  );

  const workflows = (data?.rules ?? []).filter(
    (workflow) => workflow.is_enabled,
  );

  const { status } = useDictationStatus();
  const isRecording = status?.is_recording === true;

  async function start(workflow: { id: string; name: string }) {
    try {
      await startDictationWithWorkflow(workflow);
    } catch (error) {
      await showFailureToast(errorMessage(error, "Failed to start dictation"), {
        title: "TypeWhisper",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workflows...">
      <RunningDictationSection status={status} />
      {workflows.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No enabled workflows"
          description="Create or enable workflows in TypeWhisper Settings > Workflows"
          icon={Icon.Wand}
        />
      ) : (
        workflows.map((workflow) => (
          <List.Item
            key={workflow.id}
            title={workflow.name}
            icon={Icon.Wand}
            accessories={
              workflow.translation_target_language
                ? [
                    {
                      text: `→ ${workflow.translation_target_language}`,
                      icon: Icon.Globe,
                    },
                  ]
                : []
            }
            actions={
              isRecording ? undefined : (
                <ActionPanel>
                  <Action
                    title="Start Dictation"
                    icon={Icon.Microphone}
                    onAction={() => start(workflow)}
                  />
                </ActionPanel>
              )
            }
          />
        ))
      )}
    </List>
  );
}
