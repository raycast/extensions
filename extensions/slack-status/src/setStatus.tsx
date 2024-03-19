import { ActionPanel, Detail, Icon, LaunchProps, List, closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { OAuthService, useCachedState, withAccessToken, showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  ClearStatusAction,
  CopyDeeplinkPresetAction,
  CreateQuicklinkPresetAction,
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
import { CommandLinkParams } from "./types";
import { useSlack, useSlackAuthInfo, useSlackDndInfo, useSlackProfile } from "./slack";
import { getStatusIcon, getStatusSubtitle, getStatusTitle, setStatusToPreset, slackScopes } from "./utils";

const preferences: Preferences = getPreferenceValues();

const slack = OAuthService.slack({
  scope: slackScopes.join(" "),
  personalAccessToken: preferences.accessToken,
});

function StatusListWrapper(props: LaunchProps<{ launchContext: CommandLinkParams }>) {
  const { isLoading: isLoadingAuth, data: authData } = useSlackAuthInfo();
  const [hasCheckedAuth, setHasCheckedAuth] = useCachedState("slack-status-checked-auth", false);

  useEffect(() => {
    if (isLoadingAuth || hasCheckedAuth) return;

    const checkAuthorization = async () => {
      const userScopes = authData?.response_metadata?.scopes;
      const hasNeededScopes = slackScopes.every((scope) => userScopes?.includes(scope));

      if (!hasNeededScopes) {
        await slack.client.removeTokens();
        await slack.authorize();
        return;
      }

      setHasCheckedAuth(true);
    };

    checkAuthorization();
  }, [hasCheckedAuth, authData, isLoadingAuth]);

  if (isLoadingAuth && !hasCheckedAuth) {
    return <Detail isLoading />;
  }

  return <StatusList {...props} />;
}

function StatusList(props: LaunchProps<{ launchContext: CommandLinkParams }>) {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data, mutate } = useSlackProfile();
  const { isLoading: isLoadingDnd, data: dndData, mutate: mutateDnd } = useSlackDndInfo();
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
          await setStatusToPreset({ preset: presetToLaunch, slack, mutate, mutateDnd });
          popToRoot();
          closeMainWindow();
        }
      }
    })();
  }, [slack]);

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
                  <CreateQuicklinkPresetAction preset={preset} />
                  <CopyDeeplinkPresetAction preset={preset} />
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

export default withAccessToken(slack)(StatusListWrapper);
