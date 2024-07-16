import { ActionPanel, Icon, LaunchProps, List, closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { OAuthService, withAccessToken, showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  ClearStatusAction,
  CopyDeeplinkPresetAction,
  CreateQuicklinkPresetAction,
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
import { usePresets } from "./presets";
import { CommandLinkParams } from "./types";
import { useSlack, useSlackProfile } from "./slack";
import { getStatusIcon, getStatusSubtitle, getStatusTitle, setStatusToPreset } from "./utils";

const preferences: Preferences = getPreferenceValues();

const slack = OAuthService.slack({
  scope: "emoji:read users.profile:write users.profile:read",
  personalAccessToken: preferences.accessToken,
});

function StatusList(props: LaunchProps<{ launchContext: CommandLinkParams }>) {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data, mutate } = useSlackProfile();
  const [presets, setPresets] = usePresets();
  const slack = useSlack();

  useEffect(() => {
    (async () => {
      if (props.launchContext?.presetId) {
        const presetId = props.launchContext.presetId;
        const presetToLaunch = presets.find((p) => p.id === presetId);

        if (!presetToLaunch) {
          console.error("No preset found with id: ", presetId);
          showFailureToast(new Error(`Could not find ID: "${presetId}" preset`), { title: "No preset found" });
        } else {
          await setStatusToPreset({ preset: presetToLaunch, slack, mutate });
          popToRoot();
          closeMainWindow();
        }
      }
    })();
  }, [slack]);

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
                  <CreateQuicklinkPresetAction preset={preset} />
                  <CopyDeeplinkPresetAction preset={preset} />
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

export default withAccessToken(slack)(StatusList);
