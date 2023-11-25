import { ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import {
  ClearStatusAction,
  CreateStatusPresetAction,
  DeleteStatusPresetAction,
  EditStatusPresetAction,
  SetCustomStatusAction,
  SetStatusAction,
  SetStatusWithAIAction,
  SetStatusWithDuration,
} from "./actions";
import { getTitleForDuration } from "./durations";
import { getEmojiForCode } from "./emojis";
import { withOAuthSession } from "./oauth";
import { usePresets } from "./presets";
import { SlackOAuthSessionConfig, useSlackProfile } from "./slack";
import { getStatusIcon, getStatusSubtitle, getStatusTitle } from "./utils";

const preferences: Preferences = getPreferenceValues();

const slackOAuthConfig = new SlackOAuthSessionConfig({
  clientId: "851756884692.5546927290212",
  userScopes: ["emoji:read", "users.profile:write", "users.profile:read"],
  defaultAccessToken: preferences.accessToken,
});

function StatusList() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data, mutate } = useSlackProfile();
  const [presets, setPresets] = usePresets();

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} filtering>
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
          subtitle={getStatusSubtitle(data)}
          actions={
            <ActionPanel>
              {data?.status_text ? <ClearStatusAction mutate={mutate} /> : <SetCustomStatusAction mutate={mutate} />}
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
            subtitle={getTitleForDuration(preset.defaultDuration)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <SetStatusAction preset={preset} mutate={mutate} />
                  <SetStatusWithDuration preset={preset} mutate={mutate} />
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
                  <SetCustomStatusAction mutate={mutate} />
                  <ClearStatusAction mutate={mutate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withOAuthSession(StatusList, slackOAuthConfig);
