import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  CLOSED_MESSAGE,
  Outcome,
  State,
  answer,
  answerDay,
  atFloor,
  baseOf,
  clearToday,
  correctionDay,
  dayLabel,
  offers,
  reopen,
  screenFor,
  setPromise,
  showedUp,
  smaller,
} from "./logic";
import { NUDGE_CIRCLE, OPEN_CIRCLE, PICK_CIRCLE, isEvening, outcomeIcon } from "./look";
import { loadState, mutate, todayKey } from "./storage";

// A long title is the first thing macOS hides when the menu bar is full, notch or not.
function short(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space >= 6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function subtitleFor(state: State): string | null {
  const day = state.days[todayKey()];
  if (!day?.promise) return "Pick one";
  return day.outcome ? CLOSED_MESSAGE[day.outcome] : day.promise;
}

const openList = () => launchCommand({ name: "today", type: LaunchType.UserInitiated });

export default function Command() {
  const { showTitle, eveningNudge } = getPreferenceValues<Preferences.MenuBar>();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    loadState().then(setState, () => setState({ days: {} }));
  }, []);

  // Each click re-reads what is saved, so a pick just after 4 a.m. or a click made while the list is open is safe.
  async function run(change: (s: State, t: string) => State) {
    setState(await mutate(change, { refreshMenuBar: false }));
  }

  if (!state) return <MenuBarExtra isLoading icon={Icon.Circle} />;

  // Today's thing also shows as the subtitle of this command in Raycast's root search, where people already look.
  updateCommandMetadata({ subtitle: subtitleFor(state) });

  const today = todayKey();
  const screen = screenFor(state, today);
  // An evening nudge changes the icon color and the tooltip. No sound, no notification, no counting.
  const nudge = eveningNudge && isEvening(new Date());

  if (screen === "closed") {
    const outcome = state.days[today].outcome as Outcome;
    return (
      <MenuBarExtra icon={outcomeIcon(outcome)} tooltip={CLOSED_MESSAGE[outcome]}>
        <MenuBarExtra.Item title={CLOSED_MESSAGE[outcome]} />
        <MenuBarExtra.Item title={`Days you showed up: ${showedUp(state)}`} />
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Change Today's Answer"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => run((s, t) => reopen(s, t))}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  if (screen === "promise") {
    const promise = state.days[today].promise;
    const shrunk = smaller(promise);
    return (
      <MenuBarExtra
        icon={nudge ? NUDGE_CIRCLE : OPEN_CIRCLE}
        title={showTitle ? short(promise, 14) : undefined}
        tooltip={nudge ? `${promise}\nStill open. Answer when you can.` : promise}
      >
        <MenuBarExtra.Section title={promise}>
          <MenuBarExtra.Item
            title="Done"
            icon={Icon.CheckCircle}
            onAction={() => run((s, t) => answer(s, t, "done"))}
          />
          <MenuBarExtra.Item
            title="Did Some of It"
            icon={Icon.CircleProgress50}
            onAction={() => run((s, t) => answer(s, t, "some"))}
          />
          <MenuBarExtra.Item title="Not Today" icon={Icon.Moon} onAction={() => run((s, t) => answer(s, t, "not"))} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          {!atFloor(promise) ? (
            <MenuBarExtra.Item
              title="Make It Smaller"
              subtitle={short(shrunk, 40)}
              icon={Icon.ArrowDown}
              onAction={() => run((s, t) => setPromise(s, t, smaller(s.days[t]?.promise ?? promise)))}
            />
          ) : null}
          <MenuBarExtra.Item
            title="Pick Another Thing…"
            icon={Icon.Pencil}
            onAction={async () => {
              await run((s, t) => clearToday(s, t));
              await openList();
            }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const fixDay = correctionDay(state, today);
  return (
    <MenuBarExtra
      icon={nudge ? NUDGE_CIRCLE : PICK_CIRCLE}
      title={showTitle ? "Pick one" : undefined}
      tooltip={nudge ? "Nothing picked yet. Pick when you can." : "Pick today's one thing"}
    >
      {fixDay ? (
        <MenuBarExtra.Section title={`${dayLabel(fixDay, today)}: ${short(baseOf(state.days[fixDay].promise), 30)}`}>
          <MenuBarExtra.Item
            title="Done"
            icon={Icon.CheckCircle}
            onAction={() => run((s) => answerDay(s, fixDay, "done"))}
          />
          <MenuBarExtra.Item
            title="Did Some of It"
            icon={Icon.CircleProgress50}
            onAction={() => run((s) => answerDay(s, fixDay, "some"))}
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title={screen === "welcome-back" ? "Welcome back. Pick one." : "Pick one"}>
        {offers(state, today).map((o) => (
          <MenuBarExtra.Item
            key={o.text}
            title={short(o.text, 48)}
            subtitle={o.label}
            onAction={() => run((s, t) => setPromise(s, t, o.text))}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Type Your Own…" icon={Icon.Pencil} onAction={openList} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
