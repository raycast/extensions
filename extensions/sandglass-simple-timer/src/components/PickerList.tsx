import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { renderDial, renderMiniDial, svgToDataUri } from "../lib/dial.ts";
import { formatHuman, formatTimeOfDay, greeting } from "../lib/format.ts";
import { parseDuration } from "../lib/parse.ts";
import { startTimer } from "../lib/timer-service.ts";
import type { SandglassState } from "../lib/types.ts";
import { CustomTimerForm } from "./CustomTimerForm.tsx";
import { durationTitle, hourFraction, plainDurationTitle, PRESETS } from "./helpers.ts";

interface PickerListProps {
  state: SandglassState;
  now: number;
  /** Called with the new state after a timer was started from the picker. */
  onStarted: (state: SandglassState) => void;
}

interface PickerItemProps {
  id: string;
  title: string;
  subtitle?: string;
  ms: number;
  label?: string;
  remember: boolean;
  now: number;
  onStarted: (state: SandglassState) => void;
}

function idleDial(ms: number, now: number, label?: string, caption?: string): string {
  const dial = renderDial({
    remainingMs: ms,
    totalMs: ms,
    status: "idle",
    theme: environment.appearance,
    label,
    caption,
    nowMs: now,
  });
  return `![Timer](${svgToDataUri(dial)})`;
}

function PickerItem({ id, title, subtitle, ms, label, remember, now, onStarted }: PickerItemProps) {
  const endsAt = formatTimeOfDay(now + ms);
  const markdown = `${idleDial(ms, now, label, `Ends at ${endsAt}`)}\n\nPress ↵ to start a timer for ${formatHuman(ms)}.`;

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={subtitle}
      icon={{ source: svgToDataUri(renderMiniDial(hourFraction(ms), environment.appearance)) }}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action
            title="Start Timer"
            icon={Icon.Play}
            onAction={() => {
              try {
                onStarted(startTimer(ms, label, remember));
              } catch (error) {
                void showFailureToast(error, { title: "Couldn't start the timer" });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function PickerList({ state, now, onStarted }: PickerListProps) {
  const [text, setText] = useState("");
  const typed = text.trim() ? parseDuration(text, new Date(now)) : null;

  return (
    <List
      isShowingDetail
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="How long? Try 25, 1h 30m, 10:00 or at 15:30"
    >
      {typed && (
        <List.Section title="Start">
          <PickerItem
            id="typed"
            title={`Start ${durationTitle(typed.ms)} Timer`}
            subtitle={typed.label}
            ms={typed.ms}
            label={typed.label}
            remember
            now={now}
            onStarted={onStarted}
          />
        </List.Section>
      )}
      {text.trim() && !typed && (
        <List.Item
          id="invalid"
          title="Type a time like 25, 1h 30m or at 15:30"
          icon={Icon.QuestionMarkCircle}
          detail={<List.Item.Detail markdown={`${idleDial(25 * 60_000, now)}\n\nTry 25, 1h 30m, 10:00 or at 15:30.`} />}
        />
      )}
      <List.Section title={greeting(new Date(now))}>
        {PRESETS.map((preset) => (
          <PickerItem
            key={preset.minutes}
            id={`preset-${preset.minutes}`}
            title={plainDurationTitle(preset.minutes * 60_000)}
            subtitle={preset.subtitle}
            ms={preset.minutes * 60_000}
            label={preset.label}
            remember={false}
            now={now}
            onStarted={onStarted}
          />
        ))}
      </List.Section>
      {state.recent.length > 0 && (
        <List.Section title="Recent">
          {state.recent.map((ms) => (
            <PickerItem
              key={`recent-${ms}`}
              id={`recent-${ms}`}
              title={plainDurationTitle(ms)}
              ms={ms}
              remember
              now={now}
              onStarted={onStarted}
            />
          ))}
        </List.Section>
      )}
      <List.Section>
        <List.Item
          id="custom"
          title="Custom Timer…"
          icon={Icon.Pencil}
          detail={<List.Item.Detail markdown="Set an exact duration and an optional label." />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Custom Timer…"
                icon={Icon.Pencil}
                target={<CustomTimerForm onStarted={onStarted} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
