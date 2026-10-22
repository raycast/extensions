import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  PopToRootType,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
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
  offers,
  reopen,
  screenFor,
  setPromise,
  showedUp,
  smaller,
} from "./logic";
import { PICK_CIRCLE, SELECTED_CIRCLE, outcomeIcon } from "./look";
import { deleteAll, loadState, mutate, refreshMenuBar, todayKey } from "./storage";

const FEEDBACK_URL = "https://x.com/carlomakes";

const HEADINGS = {
  first: "One thing today?",
  "welcome-back": "Welcome back.",
  choose: "One thing today?",
};

export default function Command(props: LaunchProps<{ arguments: Arguments.Today }>) {
  const [state, setState] = useState<State | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const typedArgument = props.arguments.thing?.trim();

  useEffect(() => {
    (async () => {
      try {
        // "Pick Today's Thing" followed by a thing sets it (or replaces it) and gets out of the way.
        if (typedArgument) {
          await mutate((s, t) => setPromise(s, t, typedArgument));
          await showHUD(`Today: ${typedArgument}`, { popToRootType: PopToRootType.Immediate });
          return;
        }
        setState(await loadState());
        // Opening this command also turns the menu bar item on, so setup is one step, not two.
        await refreshMenuBar();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Could not read your days", message: String(error) });
      }
    })();
  }, []);

  // Each change goes through mutate: it re-reads what is saved and works out today again.
  async function run(change: (s: State, t: string) => State, hud?: string) {
    const next = await mutate(change);
    if (hud) {
      await showHUD(hud, { popToRootType: PopToRootType.Immediate });
      return;
    }
    setState(next);
    setSearch("");
  }

  if (!state) return <List key="loading" isLoading />;

  const today = todayKey();
  const screen = screenFor(state, today);
  const common = <CommonActions onDeleted={() => setState({ days: {} })} />;

  if (screen === "closed") {
    const outcome = state.days[today].outcome as Outcome;
    const change = (
      <Action
        title="Change Today's Answer"
        icon={Icon.ArrowCounterClockwise}
        onAction={() => run((s, t) => reopen(s, t))}
      />
    );
    // Plain items instead of an EmptyView: an EmptyView rendered as a blank window next to the search bar.
    return (
      <List key="closed" filtering={false} searchBarPlaceholder="Today is closed">
        <List.Section
          title={CLOSED_MESSAGE[outcome]}
          subtitle={`Days you showed up: ${showedUp(state)}. This number only goes up.`}
        >
          <List.Item
            title={state.days[today].promise}
            subtitle="See you tomorrow."
            icon={outcomeIcon(outcome)}
            actions={<Actions main={change} common={common} />}
          />
          <List.Item
            title="Change Today's Answer"
            icon={Icon.ArrowCounterClockwise}
            actions={<Actions main={change} common={common} />}
          />
        </List.Section>
      </List>
    );
  }

  if (screen === "promise") {
    const promise = state.days[today].promise;
    const shrunk = smaller(promise);
    const finish = (outcome: Outcome, title: string, icon: Icon) => (
      <Action
        title={title}
        icon={icon}
        onAction={() => run((s, t) => answer(s, t, outcome), CLOSED_MESSAGE[outcome])}
      />
    );
    return (
      <List key="promise" filtering={false} searchBarPlaceholder="How did it go?">
        <List.Section title={promise} subtitle="Unanswered closes tonight. That's okay.">
          <List.Item
            title="Done"
            icon={Icon.CheckCircle}
            actions={<Actions main={finish("done", "Mark as Done", Icon.CheckCircle)} common={common} />}
          />
          <List.Item
            title="Did Some of It"
            icon={Icon.CircleProgress50}
            actions={<Actions main={finish("some", "Mark as Some", Icon.CircleProgress50)} common={common} />}
          />
          <List.Item
            title="Not Today"
            icon={Icon.Moon}
            actions={<Actions main={finish("not", "Mark as Not Today", Icon.Moon)} common={common} />}
          />
        </List.Section>
        <List.Section title="Or">
          {!atFloor(promise) ? (
            <List.Item
              title="Make It Smaller"
              subtitle={shrunk}
              icon={Icon.ArrowDown}
              actions={
                <Actions
                  main={
                    <Action
                      title="Make It Smaller"
                      icon={Icon.ArrowDown}
                      onAction={() =>
                        run((s, t) => setPromise(s, t, smaller(s.days[t]?.promise ?? promise)), `Smaller: ${shrunk}`)
                      }
                    />
                  }
                  common={common}
                />
              }
            />
          ) : null}
          <List.Item
            title="Pick Another Thing"
            icon={Icon.Pencil}
            actions={
              <Actions
                main={
                  <Action
                    title="Pick Another Thing"
                    icon={Icon.Pencil}
                    onAction={() => run((s, t) => clearToday(s, t))}
                  />
                }
                common={common}
              />
            }
          />
        </List.Section>
      </List>
    );
  }

  const list = offers(state, today);
  const typed = search.trim();
  const shown = typed ? list.filter((o) => o.text.toLowerCase().includes(typed.toLowerCase())) : list;
  const exact = list.some((o) => o.text.toLowerCase() === typed.toLowerCase());
  const set = (text: string) => run((s, t) => setPromise(s, t, text), `Today: ${text}`);
  const pickAction = (text: string) => (
    <Action title="Set as Today's Thing" icon={Icon.Checkmark} onAction={() => set(text)} />
  );
  const fixDay = correctionDay(state, today);

  return (
    <List
      key="choose"
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Pick one, or type your own"
    >
      {fixDay && !typed ? (
        <List.Section title={`Yesterday: ${baseOf(state.days[fixDay].promise)}`} subtitle="Did it happen after all?">
          <List.Item
            title="Done"
            icon={Icon.CheckCircle}
            actions={
              <Actions
                main={
                  <Action
                    title="Mark Yesterday as Done"
                    icon={Icon.CheckCircle}
                    onAction={() => run((s) => answerDay(s, fixDay, "done"))}
                  />
                }
                common={common}
              />
            }
          />
          <List.Item
            title="Did Some of It"
            icon={Icon.CircleProgress50}
            actions={
              <Actions
                main={
                  <Action
                    title="Mark Yesterday as Some"
                    icon={Icon.CircleProgress50}
                    onAction={() => run((s) => answerDay(s, fixDay, "some"))}
                  />
                }
                common={common}
              />
            }
          />
        </List.Section>
      ) : null}
      <List.Section
        title={HEADINGS[screen]}
        subtitle={
          screen === "first" ? "Pick one. Do it, or make it smaller. Tomorrow starts fresh." : "You can change it later"
        }
      >
        {typed && !exact ? (
          <List.Item
            title={typed}
            subtitle="Your own"
            icon={Icon.Plus}
            actions={<Actions main={pickAction(typed)} common={common} />}
          />
        ) : null}
        {shown.map((o) => (
          <List.Item
            key={o.text}
            id={o.text}
            title={o.text}
            icon={o.text === (selected ?? shown[0]?.text) ? SELECTED_CIRCLE : PICK_CIRCLE}
            accessories={o.label ? [{ tag: o.label }] : []}
            actions={<Actions main={pickAction(o.text)} common={common} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function Actions(props: { main: ReactNode; common: ReactNode }) {
  return (
    <ActionPanel>
      {props.main}
      {props.common}
    </ActionPanel>
  );
}

function CommonActions(props: { onDeleted: () => void }) {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Give Feedback" icon={Icon.Bubble} url={FEEDBACK_URL} />
      <Action
        title="Delete All Data"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
        onAction={async () => {
          const ok = await confirmAlert({
            title: "Delete everything Again saved?",
            message: "Your days are stored only on this Mac. This cannot be undone.",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          });
          if (!ok) return;
          await deleteAll();
          props.onDeleted();
        }}
      />
    </ActionPanel.Section>
  );
}
