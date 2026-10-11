import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { act, getState, Scene, sceneLink, State } from "./lib/client";
import { done, ErrorView, fail } from "./lib/ui";

type Switch = "on" | "off" | "toggle";

function Detail({ scene, state }: { scene: Scene; state: State }) {
  const mic = state.inputs.find((d) => d.current)?.name;
  const speakers = state.outputs.find((d) => d.current)?.name;
  const automation = state.paused ? "Paused" : state.automationEnabled ? "On" : "Off";
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {scene.active && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={state.manual ? "Chosen by hand" : "Active"}
                color={Color.Green}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {scene.active && !state.manual && state.reason && (
            <List.Item.Detail.Metadata.Label title="Why" text={state.reason} />
          )}
          <List.Item.Detail.Metadata.Label title="When" text={scene.summary} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Microphone"
            text={scene.input ?? "Not connected"}
            icon={Icon.Microphone}
          />
          <List.Item.Detail.Metadata.Label
            title="Speakers"
            text={scene.output ?? "Not connected"}
            icon={Icon.SpeakerHigh}
          />
          {scene.hotkey && (
            <List.Item.Detail.Metadata.Label title="Shortcut" text={scene.hotkey} icon={Icon.Keyboard} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Now using"
            text={mic ?? "–"}
            icon={state.muted ? Icon.MicrophoneDisabled : Icon.Microphone}
          />
          <List.Item.Detail.Metadata.Label
            title=""
            text={`${speakers ?? "–"}${state.volume === undefined ? "" : ` · ${Math.round(state.volume * 100)}%`}`}
            icon={Icon.SpeakerHigh}
          />
          <List.Item.Detail.Metadata.Label title="Microphone" text={state.muted ? "Muted" : "On"} />
          <List.Item.Detail.Metadata.Label title="Automation" text={automation} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { data: state, error, isLoading, revalidate, mutate } = usePromise(getState);

  const run = async (work: Promise<State>, text: (s: State) => string) => {
    try {
      const next = await work;
      await mutate(Promise.resolve(next), { shouldRevalidateAfter: false });
      await done(text(next));
    } catch (e) {
      await fail(e);
    }
  };

  const apply = (scene: Scene) => run(act({ cmd: "applyScene", scene: scene.id }), () => `Scene: ${scene.name}`);
  const mute = (action: Switch) =>
    run(act({ cmd: "mute", action }), (s) => (s.muted ? "Microphone muted" : "Microphone on"));
  const automation = (action: Switch) =>
    run(act({ cmd: "automation", action }), (s) => (s.automationEnabled ? "Automation on" : "Automation off"));
  const resume = () => run(act({ cmd: "resume" }), () => "Automation resumed");

  return (
    <List isLoading={isLoading} isShowingDetail={!!state} searchBarPlaceholder="Search scenes">
      {error && !state ? (
        <ErrorView error={error} retry={revalidate} />
      ) : (
        state?.scenes.map((scene) => (
          <List.Item
            key={scene.id}
            title={scene.name}
            icon={
              scene.active
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : scene.fallback
                  ? Icon.House
                  : Icon.Circle
            }
            keywords={[scene.summary]}
            accessories={
              scene.active && state.paused
                ? [{ icon: { source: Icon.Pause, tintColor: Color.Orange }, tooltip: "Automation paused" }]
                : []
            }
            detail={<Detail scene={scene} state={state} />}
            actions={
              <ActionPanel>
                <Action title="Apply Scene" icon={Icon.Check} onAction={() => apply(scene)} />
                <ActionPanel.Section>
                  <Action
                    title={state.muted ? "Unmute Microphone" : "Mute Microphone"}
                    icon={state.muted ? Icon.Microphone : Icon.MicrophoneDisabled}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                    onAction={() => mute("toggle")}
                  />
                  <Action
                    title={state.automationEnabled ? "Turn Automation Off" : "Turn Automation On"}
                    icon={Icon.Wand}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => automation("toggle")}
                  />
                  {state.paused && (
                    <Action
                      title="Resume Automation"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                      onAction={resume}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CreateQuicklink
                    title="Create Quicklink for Scene"
                    quicklink={{ name: `ToneCue: ${scene.name}`, link: sceneLink(scene.name) }}
                  />
                  <Action.CopyToClipboard title="Copy Scene Link" content={sceneLink(scene.name)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
