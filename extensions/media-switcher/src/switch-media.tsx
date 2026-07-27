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

interface Preferences {
  volumeStep: string;
}

export default function Command() {
  const {
    isLoading,
    data: sessions,
    revalidate,
  } = usePromise(async () => {
    return list_sessions();
  }, []);
  const { volumeStep } = getPreferenceValues<Preferences>();
  const volStep = Math.max(1, parseInt(volumeStep, 10) || 5);

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
          key={session.app_id}
          icon={session.is_playing ? { source: Icon.Play, tintColor: Color.Green } : Icon.Pause}
          title={session.title || "No title"}
          subtitle={session.artist || session.app_name}
          accessories={[{ text: session.app_name }]}
          actions={
            <ActionPanel>
              {session.is_playing ? (
                <ActionPanel.Section>
                  <ActionPause appId={session.app_id} revalidate={revalidate} />
                  <ActionReveal appId={session.app_id} />
                  <ActionCopyTrackInfo title={session.title} artist={session.artist} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  {sessions?.some((s) => s.is_playing) && (
                    <ActionSwitch appId={session.app_id} revalidate={revalidate} />
                  )}
                  <ActionPlay appId={session.app_id} revalidate={revalidate} />
                  <ActionReveal appId={session.app_id} />
                  <ActionCopyTrackInfo title={session.title} artist={session.artist} />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <ActionPreviousTrack appId={session.app_id} revalidate={revalidate} />
                <ActionNextTrack appId={session.app_id} revalidate={revalidate} />
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
