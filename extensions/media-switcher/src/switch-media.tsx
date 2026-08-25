import { ActionPanel, List, Icon, getPreferenceValues, showToast, Toast, Action, Color } from "@raycast/api";
import { useEffect, useRef } from "react";
import { usePromise } from "@raycast/utils";
import {
  PauseAction,
  PlayAction,
  SwitchAction,
  RevealApplicationAction,
  PreviousTrackAction,
  NextTrackAction,
  CopyTrackInfoAction,
  VolumeUpAction,
  VolumeDownAction,
  RefreshAction,
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
  const prefs = getPreferenceValues<Preferences.SwitchMedia>();
  const refreshSeconds = Math.max(0, parseInt(prefs.refreshInterval ?? "0", 10) || 0);
  const volStep = Math.min(MAX_SAFE_STEP, Math.max(1, parseInt(prefs.volumeStep ?? "5", 10) || 5));

  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (refreshSeconds <= 0) return;
    const id = setInterval(() => {
      if (!isLoadingRef.current) {
        revalidate();
      }
    }, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [refreshSeconds, revalidate]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search media sessions…">
      {sessions?.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Play}
          title="No media sessions found"
          description="Open a media app (Spotify, browser, etc.) to see it here"
        />
      )}
      {sessions?.map((session) => {
        const hasIdentity = Boolean(session.title.trim() || session.artist.trim());
        return (
          <List.Item
            key={`${session.app_id}-${session.session_index}`}
            icon={
              session.icon_path
                ? { value: { source: `file:///${session.icon_path}` }, tooltip: session.app_name }
                : session.exe_path
                  ? { value: { fileIcon: session.exe_path }, tooltip: session.app_name }
                  : { value: Icon.Music, tooltip: session.app_name }
            }
            title={session.title ? { value: session.title, tooltip: session.title } : "No title"}
            subtitle={
              session.artist
                ? { value: session.artist, tooltip: session.artist }
                : { value: session.app_name, tooltip: session.app_name }
            }
            accessories={[
              {
                icon: session.is_playing ? { source: Icon.Waveform, tintColor: Color.Green } : Icon.Pause,
                text: session.is_playing ? { value: "Playing", color: Color.Green } : "Paused",
              },
            ]}
            actions={
              <ActionPanel>
                {hasIdentity ? (
                  <>
                    {session.is_playing ? (
                      <ActionPanel.Section>
                        <PauseAction
                          appId={session.app_id}
                          sessionIndex={session.session_index}
                          titlePrefix={session.title}
                          artistPrefix={session.artist}
                          revalidate={revalidate}
                        />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        {sessions?.some((s) => s.is_playing) && (
                          <SwitchAction
                            appId={session.app_id}
                            sessionIndex={session.session_index}
                            titlePrefix={session.title}
                            artistPrefix={session.artist}
                            revalidate={revalidate}
                          />
                        )}
                        <PlayAction
                          appId={session.app_id}
                          sessionIndex={session.session_index}
                          titlePrefix={session.title}
                          artistPrefix={session.artist}
                          revalidate={revalidate}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      <PreviousTrackAction
                        appId={session.app_id}
                        sessionIndex={session.session_index}
                        titlePrefix={session.title}
                        artistPrefix={session.artist}
                        revalidate={revalidate}
                      />
                      <NextTrackAction
                        appId={session.app_id}
                        sessionIndex={session.session_index}
                        titlePrefix={session.title}
                        artistPrefix={session.artist}
                        revalidate={revalidate}
                      />
                    </ActionPanel.Section>
                  </>
                ) : (
                  <ActionPanel.Section>
                    <Action
                      title="Playback Unavailable"
                      icon={Icon.Info}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No playback control",
                          message:
                            "This session reports no title or artist, so it cannot be reliably identified. Refresh and try again.",
                        });
                      }}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <RevealApplicationAction
                    appId={session.app_id}
                    exePath={session.exe_path}
                    iconPath={session.icon_path}
                  />
                  <CopyTrackInfoAction title={session.title} artist={session.artist} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <VolumeUpAction volStep={volStep} />
                  <VolumeDownAction volStep={volStep} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <RefreshAction revalidate={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
