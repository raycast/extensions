import { ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { OAuthService, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import {
  ClearStatusAction,
  CreateStatusPresetAction,
  DeleteStatusPresetAction,
  EditStatusPresetAction,
  ResumeNotificationsAction,
  SetCustomStatusAction,
  SetStatusAction,
  SetStatusWithAIAction,
  SetStatusWithDuration,
} from "./actions";
import { getPresetDurationsTitle } from "./durations";
import { getEmojiForCode } from "./emojis";
import { usePresets } from "./presets";
import { useSlackDndInfo, useSlackProfile, useSlackUserIdentity } from "./slack";
import { getStatusIcon, getStatusSubtitle, getStatusTitle } from "./utils";

const preferences: Preferences = getPreferenceValues();

const slack = OAuthService.slack({
  scope: "emoji:read users.profile:write users.profile:read dnd:read dnd:write",
  personalAccessToken: preferences.accessToken,
});

function StatusList() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data, mutate } = useSlackProfile();
  const { isLoading: isLoadingDnd, data: dndData, mutate: mutateDnd } = useSlackDndInfo();
  const { data: userIdentity } = useSlackUserIdentity();
  const [presets, setPresets] = usePresets();

  return (
    <List isLoading={isLoading || isLoadingDnd} onSearchTextChange={setSearchText} filtering>
      <List.EmptyView
        icon={Icon.Stars}
        title={searchText ? `Set status to '${searchText}'` : undefined}
        description="Raycast AI picks the best emoji, text and duration for your status"
        actions={
          <ActionPanel>{searchText && <SetStatusWithAIAction statusText={searchText} mutate={mutate} />}</ActionPanel>
        }
      />
      <List.Section title="Current Status">
        <List.Item
          key="current-status"
          icon={getStatusIcon(data)}
          title={getStatusTitle(data)}
          subtitle={getStatusSubtitle(data, dndData)}
          actions={
            <ActionPanel>
              {data?.status_text ? (
                <ClearStatusAction mutate={mutate} mutateDnd={mutateDnd} />
              ) : (
                <SetCustomStatusAction mutate={mutate} mutateDnd={mutateDnd} />
              )}
              {!!dndData?.snooze_enabled && <ResumeNotificationsAction mutate={mutateDnd} />}
              <CreateStatusPresetAction onCreate={(newPreset) => setPresets([...presets, newPreset])} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Presets">
        {presets.map((preset) => (
          <List.Item
            key={JSON.stringify(preset)}
            icon={getEmojiForCode(preset.emojiCode)}
            title={preset.title}
            subtitle={getPresetDurationsTitle(preset)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <SetStatusAction preset={preset} mutate={mutate} mutateDnd={mutateDnd} />
                  <SetStatusWithDuration preset={preset} mutate={mutate} mutateDnd={mutateDnd} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <EditStatusPresetAction
                    preset={preset}
                    onEdit={(editedPreset) => {
                      setPresets(presets.map((p) => (p === preset ? editedPreset : p)));
                    }}
                  />
                  <DeleteStatusPresetAction onDelete={() => setPresets(presets.filter((p) => p !== preset))} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <CreateStatusPresetAction onCreate={(newPreset) => setPresets([...presets, newPreset])} />
                  <SetCustomStatusAction mutate={mutate} mutateDnd={mutateDnd} />
                  <ClearStatusAction mutate={mutate} mutateDnd={mutateDnd} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withAccessToken(slack)(StatusList);
