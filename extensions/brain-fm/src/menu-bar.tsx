import { Color, Icon, MenuBarExtra, getPreferenceValues, openExtensionPreferences, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { controlAndVerify, openBrainFm, readOrControl } from "./lib/player";
import { explicitPlaybackAction, PlaybackAction } from "./lib/player-script";

async function openPlayer() {
  try {
    await openBrainFm();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Brain.fm" });
  }
}

export default function BrainFmMenuBar() {
  const { showTitle } = getPreferenceValues<Preferences.MenuBar>();
  const { data, isLoading, error, revalidate } = usePromise(() => readOrControl("status"));

  const playing = data?.state === "playing";
  const title = showTitle && playing ? data?.title?.slice(0, 28) : undefined;

  async function control(action: Exclude<PlaybackAction, "status">, label: string) {
    if (!data) return;
    try {
      await controlAndVerify(action, { browser: data.browser, tabId: data.tabId });
      await showHUD(label);
    } catch (cause) {
      await showHUD(`⚠️ ${cause instanceof Error ? cause.message : "Brain.fm didn't respond"}`);
    }
    revalidate();
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: playing ? Icon.Waveform : Icon.Headphones, tintColor: error ? Color.SecondaryText : undefined }}
      title={title}
      tooltip={data?.title ? `Brain.fm · ${data.title}` : "Brain.fm"}
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Brain.fm player not found" icon={Icon.Warning} />
          <MenuBarExtra.Item title="Open Brain.fm" icon={Icon.Globe} onAction={openPlayer} />
          <MenuBarExtra.Item title="Choose Browser…" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : data ? (
        <>
          <MenuBarExtra.Section title="Now Playing">
            <MenuBarExtra.Item
              title={data.title || "Brain.fm"}
              subtitle={[data.state, data.timer].filter(Boolean).join(" · ")}
              icon={Icon.Music}
              onAction={openPlayer}
            />
          </MenuBarExtra.Section>
          {data.state === "playing" || data.state === "paused" ? (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item
                title={playing ? "Pause" : "Play"}
                icon={playing ? Icon.Pause : Icon.Play}
                onAction={() => control(explicitPlaybackAction(data.state), playing ? "Paused" : "Playing")}
              />
              {data.canSkip ? (
                <MenuBarExtra.Item title="Skip Track" icon={Icon.Forward} onAction={() => control("skip", "Skipped")} />
              ) : null}
              {data.canPrevious ? (
                <MenuBarExtra.Item
                  title="Previous Track"
                  icon={Icon.Rewind}
                  onAction={() => control("previous", "Previous track")}
                />
              ) : null}
            </MenuBarExtra.Section>
          ) : (
            <MenuBarExtra.Item title="Start a session in Brain.fm" icon={Icon.Info} />
          )}
        </>
      ) : null}
    </MenuBarExtra>
  );
}
