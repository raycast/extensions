import { ActionPanel, List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  ActionPause,
  ActionPlay,
  ActionSwitch,
  ActionReveal,
  ActionPreviousTrack,
  ActionNextTrack,
  ActionCopyTrackInfo,
  ActionVolumeUp,
  ActionVolumeDown,
  ActionRefresh,
} from "./components/Actions";
import { list_sessions } from "rust:../rust";

const MAX_SAFE_STEP = 100;

export default function Command() {
  const {
    isLoading,
    data: sessions,
    revalidate,
  } = usePromise(async () => {
    return list_sessions();
  }, []);
  const prefs = getPreferenceValues<{ volumeStep?: string }>();
  const volStep = Math.min(MAX_SAFE_STEP, Math.max(1, parseInt(prefs.volumeStep ?? "5", 10) || 5));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search media sessions…">
      {sessions?.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Play}
          title="No media sessions found"
          description="Open a media app (Spotify, browser, etc.) to see it here"
        />
      )}
      {sessions?.map((session) => (
        <List.Item
          key={`${session.app_id}-${session.session_index}`}
          icon={session.is_playing ? { source: Icon.Play, tintColor: Color.Green } : Icon.Pause}
          title={session.title || "No title"}
          subtitle={session.artist || session.app_name}
          accessories={[{ text: session.app_name }]}
          actions={
            <ActionPanel>
              {session.is_playing ? (
                <ActionPanel.Section>
                  <ActionPause
                    appId={session.app_id}
                    sessionIndex={session.session_index}
                    titlePrefix={session.title_prefix}
                    revalidate={revalidate}
                  />
                  <ActionReveal appId={session.app_id} />
                  <ActionCopyTrackInfo title={session.title} artist={session.artist} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  {sessions?.some((s) => s.is_playing) && (
                    <ActionSwitch
                      appId={session.app_id}
                      sessionIndex={session.session_index}
                      titlePrefix={session.title_prefix}
                      revalidate={revalidate}
                    />
                  )}
                  <ActionPlay
                    appId={session.app_id}
                    sessionIndex={session.session_index}
                    titlePrefix={session.title_prefix}
                    revalidate={revalidate}
                  />
                  <ActionReveal appId={session.app_id} />
                  <ActionCopyTrackInfo title={session.title} artist={session.artist} />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <ActionPreviousTrack
                  appId={session.app_id}
                  sessionIndex={session.session_index}
                  titlePrefix={session.title_prefix}
                  revalidate={revalidate}
                />
                <ActionNextTrack
                  appId={session.app_id}
                  sessionIndex={session.session_index}
                  titlePrefix={session.title_prefix}
                  revalidate={revalidate}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ActionVolumeUp volStep={volStep} />
                <ActionVolumeDown volStep={volStep} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ActionRefresh revalidate={revalidate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
