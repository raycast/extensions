import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { killSessions, type TmuxSession } from "./utils/sessionUtils";

interface KillSessionsListProps {
  sessions: TmuxSession[];
  callback?: () => void;
}

export const KillSessionsList = ({ sessions, callback }: KillSessionsListProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { pop } = useNavigation();

  const toggle = (name: string) => {
    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      return next;
    });
    setLastToggled(name);
  };

  const selectRangeTo = (name: string) => {
    const names = sessions.map((session) => session.name);
    const from = lastToggled ? names.indexOf(lastToggled) : -1;

    if (from === -1) {
      toggle(name);
      return;
    }

    const to = names.indexOf(name);
    const [start, end] = from < to ? [from, to] : [to, from];

    setSelected((previous) => {
      const next = new Set(previous);

      for (let i = start; i <= end; i++) {
        next.add(names[i]);
      }

      return next;
    });
    setLastToggled(name);
  };

  const selectAll = () => setSelected(new Set(sessions.map((session) => session.name)));

  const selectAllNumeric = () =>
    setSelected((previous) => {
      const next = new Set(previous);

      sessions.filter((session) => /^\d+$/.test(session.name)).forEach((session) => next.add(session.name));

      return next;
    });

  const deselectAll = () => setSelected(new Set());

  const killSelected = async () => {
    // Keep list order so the confirmation reads naturally
    const names = sessions.map((session) => session.name).filter((name) => selected.has(name));

    if (names.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No sessions selected" });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Kill ${names.length} ${names.length === 1 ? "session" : "sessions"}?`,
      message: names.join(", "),
      primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "" });

    killSessions(names, (error, _stdout, stderr) => {
      if (error || stderr) {
        console.error(`exec error: ${error || stderr}`);

        toast.style = Toast.Style.Failure;
        toast.title = "Something went wrong 😢";
        toast.message = error ? error.message : stderr;
        setLoading(false);
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Killed ${names.length} ${names.length === 1 ? "session" : "sessions"}`;
      setLoading(false);

      callback && callback();
      pop();
    });
  };

  return (
    <List
      isLoading={loading}
      navigationTitle={`Kill Multiple Sessions — ${selected.size} selected`}
      searchBarPlaceholder="Filter sessions…"
    >
      {sessions.map((session) => {
        const isSelected = selected.has(session.name);

        return (
          <List.Item
            key={session.name}
            icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={session.name}
            accessories={[
              { text: `${session.windows} ${session.windows === 1 ? "window" : "windows"}` },
              ...(isSelected ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green } }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isSelected ? "Deselect Session" : "Select Session"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(session.name)}
                  />
                  <Action
                    title="Select Range from Last Toggled"
                    icon={Icon.List}
                    onAction={() => selectRangeTo(session.name)}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                  />
                  <Action
                    title={`Kill Selected (${selected.size})`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={killSelected}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Selection">
                  <Action
                    title="Select All"
                    icon={Icon.CheckCircle}
                    onAction={selectAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="Select All Numeric"
                    icon={Icon.Hashtag}
                    onAction={selectAllNumeric}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                  <Action
                    title="Deselect All"
                    icon={Icon.Circle}
                    onAction={deselectAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
