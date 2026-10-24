import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { act, getState, State } from "./lib/client";
import { describePause, parseCustomPause, PauseOption, PRESETS } from "./lib/pause";
import { done, ErrorView, fail } from "./lib/ui";

export default function Command() {
  const [query, setQuery] = useState("");
  const { data: state, error, isLoading, revalidate, mutate } = usePromise(getState);

  const run = async (work: Promise<State>, text: (s: State) => string) => {
    try {
      const next = await work;
      await mutate(Promise.resolve(next), { optimisticUpdate: () => next, shouldRevalidateAfter: false });
      await done(text(next));
    } catch (e) {
      await fail(e);
    }
  };

  const pause = (option: PauseOption) => run(act({ cmd: "pause", ...option.request }), describePause);
  const resume = () => run(act({ cmd: "resume" }), () => "TalkRemind resumed");

  // The list is short, so it filters by hand: a typed time or length has to stay in view as its own entry.
  const custom = parseCustomPause(query);
  const text = query.trim().toLowerCase();
  const presets = custom || !text ? PRESETS : PRESETS.filter((p) => p.title.toLowerCase().includes(text));
  const options = custom ? [custom, ...presets] : presets;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Pause for…  try 15:30, 45m or 2h"
    >
      {error && !state ? (
        <ErrorView error={error} retry={revalidate} />
      ) : (
        <>
          {state?.paused && (
            <List.Section title="Now">
              <List.Item
                title="Resume TalkRemind"
                subtitle={describePause(state)}
                icon={{ source: Icon.Play, tintColor: Color.Green }}
                actions={
                  <ActionPanel>
                    <Action title="Resume" icon={Icon.Play} onAction={resume} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title={state?.paused ? "Pause Again" : "Pause"}>
            {options.map((option, index) => (
              <List.Item
                key={`${option.id}-${index}`}
                title={option.title}
                subtitle={option.subtitle}
                icon={option === custom ? Icon.Clock : Icon.Pause}
                actions={
                  <ActionPanel>
                    <Action title="Pause" icon={Icon.Pause} onAction={() => pause(option)} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
