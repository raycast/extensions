import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { apiGet, apiPut, errorMessage, TypeWhisperError } from "./api";
import type { ProfilesResponse } from "./types";
import {
  RunningDictationSection,
  useDictationStatus,
} from "./running-dictation";
import { startDictationWithWorkflow } from "./workflow-dictation";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(() =>
    apiGet<ProfilesResponse>("/v1/profiles"),
  );

  async function toggleWorkflow(id: string, name: string) {
    try {
      await apiPut("/v1/profiles/toggle", { id });
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: `Toggled "${name}"`,
      });
    } catch (error) {
      const msg =
        error instanceof TypeWhisperError
          ? error.message
          : "Failed to toggle workflow";
      await showToast({ style: Toast.Style.Failure, title: msg });
    }
  }

  const { status } = useDictationStatus();
  const isRecording = status?.is_recording === true;

  async function dictate(workflow: { id: string; name: string }) {
    try {
      await startDictationWithWorkflow(workflow);
    } catch (error) {
      await showFailureToast(errorMessage(error, "Failed to start dictation"), {
        title: "TypeWhisper",
      });
    }
  }

  const profiles = data?.profiles ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workflows...">
      <RunningDictationSection status={status} />
      {profiles.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No workflows configured"
          description="Create workflows in TypeWhisper Settings > Workflows"
          icon={Icon.Wand}
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={profile.bundle_identifiers.join(", ") || undefined}
            icon={
              profile.is_enabled
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[
              ...(profile.input_language
                ? [
                    {
                      tag: { value: profile.input_language, color: Color.Blue },
                    },
                  ]
                : []),
              ...(profile.url_patterns.length > 0
                ? [{ text: profile.url_patterns.join(", "), icon: Icon.Globe }]
                : []),
              { text: profile.is_enabled ? "Enabled" : "Disabled" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={
                    profile.is_enabled ? "Disable Workflow" : "Enable Workflow"
                  }
                  icon={profile.is_enabled ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggleWorkflow(profile.id, profile.name)}
                />
                {profile.is_enabled && !isRecording && (
                  <Action
                    title="Dictate with Workflow"
                    icon={Icon.Microphone}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "d" },
                      Windows: { modifiers: ["ctrl"], key: "d" },
                    }}
                    onAction={() => dictate(profile)}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
