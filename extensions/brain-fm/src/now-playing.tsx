import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { controlAndVerify, openBrainFm, readOrControl } from "./lib/player";
import { explicitPlaybackAction, PlaybackAction } from "./lib/player-script";

const escape = (text: string) => text.replace(/[\\`*_{}[\]()#+.!<>|]/g, "\\$&");

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => readOrControl("status"));
  async function control(action: Exclude<PlaybackAction, "status">) {
    try {
      if (!data) return;
      await controlAndVerify(action, { browser: data.browser, tabId: data.tabId });
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not control Brain.fm" });
    }
  }
  const markdown = error
    ? `# Connect the Brain.fm Player\n\n${escape(error.message)}\n\nKeep one signed-in player tab open in your selected browser. Start a session in Brain.fm before using playback commands.`
    : data
      ? `# ${escape(data.title || "Brain.fm")}\n\n${data.state === "unavailable" ? "Start a session in Brain.fm to make player controls available." : `**${data.state.charAt(0).toUpperCase() + data.state.slice(1)}**${data.timer ? ` · ${escape(data.timer)}` : ""}`}\n\nBrain.fm's own browser media-key handlers remain in place. macOS routes hardware media keys to its active media session.\n\nIf another app receives those keys, select Brain.fm in your browser's media controls or resume it once in its player.`
      : "Reading your Brain.fm player…";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Playback" text={data.state} />
            <Detail.Metadata.Label title="Timer" text={data.timer || "Unavailable"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Media Session"
              text={data.mediaSession.supported ? "Supported" : "Unavailable"}
            />
            <Detail.Metadata.Label title="Session State" text={data.mediaSession.playbackState} />
            <Detail.Metadata.Label title="Session Track" text={data.mediaSession.title || "No metadata"} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && (data.state === "playing" || data.state === "paused") ? (
            <ActionPanel.Section title="Playback">
              <Action
                title={data.state === "playing" ? "Pause" : "Play"}
                icon={data.state === "playing" ? Icon.Pause : Icon.Play}
                onAction={() => control(explicitPlaybackAction(data.state))}
              />
              {data.canSkip ? <Action title="Skip Track" icon={Icon.Forward} onAction={() => control("skip")} /> : null}
              {data.canPrevious ? (
                <Action
                  title="Previous Track"
                  icon={Icon.Rewind}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => control("previous")}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action
              title="Refresh Player"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action
              title="Open Brain.fm"
              icon={Icon.Globe}
              onAction={() =>
                openBrainFm().catch((error) => showFailureToast(error, { title: "Couldn't open Brain.fm" }))
              }
            />
            <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
