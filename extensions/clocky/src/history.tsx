import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getSessions, getVacationDays, saveSessions, toggleVacationDay } from "./storage";
import { Pause, Session } from "./types";
import {
  dayKeyFromIso,
  formatDayLabel,
  formatTime,
  getWorkAndBreak,
  hasAnotherOpenSession,
  hasOverlappingPause,
  isPauseWithinSession,
  msBetween,
  msToClock,
  newSessionId,
} from "./utils";

type SessionFormValues = {
  start: Date;
  end?: Date;
};

type PauseFormValues = {
  start: Date;
  end?: Date;
};

export default function Command() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    const [all, vacations] = await Promise.all([getSessions(), getVacationDays()]);
    all.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    setSessions(all);
    setVacationDays(vacations);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; date: Date; isVacation: boolean }>();
    for (const session of sessions) {
      const key = dayKeyFromIso(session.start);
      const entry = map.get(key) ?? { sessions: [], date: new Date(session.start), isVacation: false };
      entry.sessions.push(session);
      if (!entry.date) entry.date = new Date(session.start);
      map.set(key, entry);
    }
    for (const key of vacationDays) {
      const entry = map.get(key) ?? { sessions: [], date: dayFromKey(key), isVacation: false };
      entry.isVacation = true;
      map.set(key, entry);
    }
    const list = Array.from(map.entries()).map(([key, entry]) => {
      const sorted = [...entry.sessions].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      const date = sorted[0] ? new Date(sorted[0].start) : entry.date;
      return { key, date, sessions: sorted, isVacation: entry.isVacation };
    });
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [sessions, vacationDays]);

  const addSession = async (values: SessionFormValues): Promise<boolean> => {
    const updated = await getSessions();
    if (!values.end && hasAnotherOpenSession(updated)) {
      await showToast(Toast.Style.Failure, "Another session is already open");
      return false;
    }
    updated.push({ id: newSessionId(), start: values.start.toISOString(), end: values.end?.toISOString(), pauses: [] });
    updated.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    await saveSessions(updated);
    setSessions(updated);
    await showToast(Toast.Style.Success, "Session added");
    return true;
  };

  const updateSession = async (id: string, values: SessionFormValues): Promise<boolean> => {
    const updated = await getSessions();
    const session = updated.find((s) => s.id === id);
    if (!session) {
      await showToast(Toast.Style.Failure, "Session not found");
      return false;
    }
    if (!values.end && hasAnotherOpenSession(updated, id)) {
      await showToast(Toast.Style.Failure, "Another session is already open");
      return false;
    }
    session.start = values.start.toISOString();
    session.end = values.end ? values.end.toISOString() : undefined;
    session.pauses = session.pauses ?? [];
    updated.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    await saveSessions(updated);
    setSessions(updated);
    await showToast(Toast.Style.Success, "Session updated");
    return true;
  };

  const deleteSession = async (id: string) => {
    const confirmed = await confirmAlert({
      title: "Delete session?",
      message: "This will remove the session and its pauses.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const updated = (await getSessions()).filter((session) => session.id !== id);
    await saveSessions(updated);
    setSessions(updated);
    await showToast(Toast.Style.Success, "Session deleted");
  };

  const toggleVacation = async (day: Date) => {
    const updated = await toggleVacationDay(dayKeyFromIso(day.toISOString()));
    setVacationDays(updated);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sessions">
      {groups.map((group) => (
        <List.Section
          key={group.key}
          title={formatDayLabel(group.date)}
          subtitle={`${group.sessions.length} session(s)${group.isVacation ? " | Vacation" : ""}`}
        >
          {group.isVacation ? (
            <List.Item
              key={`${group.key}-vacation`}
              icon={Icon.Calendar}
              title="Vacation Day"
              accessories={[{ text: "Vacation" }]}
              actions={
                <ActionPanel>
                  <Action title="Remove Vacation Day" icon={Icon.Circle} onAction={() => toggleVacation(group.date)} />
                </ActionPanel>
              }
            />
          ) : null}
          {group.sessions.map((session) => {
            const totals = getWorkAndBreak(session);
            const title = `${formatTime(session.start)} - ${session.end ? formatTime(session.end) : "Open"}`;
            const subtitle = `Net ${msToClock(totals.net)} | Breaks ${msToClock(totals.breaks)}`;
            return (
              <List.Item
                key={session.id}
                icon={Icon.Clock}
                title={title}
                subtitle={subtitle}
                accessories={[{ text: msToClock(totals.net) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Session"
                      icon={Icon.Pencil}
                      target={
                        <SessionForm
                          title="Edit Session"
                          initial={session}
                          onSave={(values) => updateSession(session.id, values)}
                        />
                      }
                    />
                    <Action.Push
                      title="Manage Pauses"
                      icon={Icon.Pause}
                      target={<PauseList sessionId={session.id} onRefresh={refresh} />}
                    />
                    <Action.Push
                      title="Add Session"
                      icon={Icon.Plus}
                      target={<SessionForm title="Add Session" onSave={addSession} />}
                    />
                    <Action
                      title={group.isVacation ? "Remove Vacation Day" : "Mark Vacation Day"}
                      icon={Icon.Calendar}
                      onAction={() => toggleVacation(group.date)}
                    />
                    <Action
                      title="Delete Session"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteSession(session.id)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      <List.EmptyView
        title="No sessions yet"
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Session"
              icon={Icon.Plus}
              target={<SessionForm title="Add Session" onSave={addSession} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function dayFromKey(key: string) {
  return new Date(`${key}T00:00:00`);
}

function SessionForm({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial?: Session;
  onSave: (values: SessionFormValues) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [start, setStart] = useState<Date>(initial ? new Date(initial.start) : new Date());
  const [hasEnd, setHasEnd] = useState(!!initial?.end);
  const [end, setEnd] = useState<Date>(initial?.end ? new Date(initial.end) : new Date());

  const handleSubmit = async () => {
    if (hasEnd && end.getTime() < start.getTime()) {
      await showToast(Toast.Style.Failure, "End time must be after start time");
      return;
    }
    const success = await onSave({ start, end: hasEnd ? end : undefined });
    if (success) pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Session" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={title} text="Adjust the session start and end times." />
      <Form.DatePicker
        id="start"
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        value={start}
        onChange={(value) => value && setStart(value)}
      />
      <Form.Checkbox id="hasEnd" label="Has End" value={hasEnd} onChange={setHasEnd} />
      {hasEnd ? (
        <Form.DatePicker
          id="end"
          title="End"
          type={Form.DatePicker.Type.DateTime}
          value={end}
          onChange={(value) => value && setEnd(value)}
        />
      ) : null}
    </Form>
  );
}

function PauseList({ sessionId, onRefresh }: { sessionId: string; onRefresh: () => Promise<void> }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    setIsLoading(true);
    const sessions = await getSessions();
    setSession(sessions.find((s) => s.id === sessionId) ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, [sessionId]);

  const saveSessionPauses = async (nextPauses: Pause[]) => {
    const sessions = await getSessions();
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) {
      await showToast(Toast.Style.Failure, "Session not found");
      return;
    }
    target.pauses = nextPauses;
    await saveSessions(sessions);
    await onRefresh();
    await load();
  };

  const addPause = async (values: PauseFormValues): Promise<boolean> => {
    if (!session) return false;
    const sessionStart = new Date(session.start);
    const sessionEnd = session.end ? new Date(session.end) : null;
    const pauseEnd = values.end ?? null;
    if (!isPauseWithinSession(sessionStart, sessionEnd, values.start, pauseEnd)) {
      await showToast(Toast.Style.Failure, "Pause must be within the session's time span");
      return false;
    }
    const existing = session.pauses ?? [];
    const overlaps = hasOverlappingPause(existing, values.start, pauseEnd);
    const next = [...existing, { start: values.start.toISOString(), end: values.end?.toISOString() }];
    next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    await saveSessionPauses(next);
    if (overlaps) {
      await showToast(Toast.Style.Success, "Pause added", "Overlaps with another pause");
    } else {
      await showToast(Toast.Style.Success, "Pause added");
    }
    return true;
  };

  const updatePause = async (index: number, values: PauseFormValues): Promise<boolean> => {
    if (!session) return false;
    const existing = session.pauses ?? [];
    if (!existing[index]) return false;
    const sessionStart = new Date(session.start);
    const sessionEnd = session.end ? new Date(session.end) : null;
    const pauseEnd = values.end ?? null;
    if (!isPauseWithinSession(sessionStart, sessionEnd, values.start, pauseEnd)) {
      await showToast(Toast.Style.Failure, "Pause must be within the session's time span");
      return false;
    }
    const overlaps = hasOverlappingPause(existing, values.start, pauseEnd, index);
    const next = [...existing];
    next[index] = { start: values.start.toISOString(), end: values.end?.toISOString() };
    next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    await saveSessionPauses(next);
    if (overlaps) {
      await showToast(Toast.Style.Success, "Pause updated", "Overlaps with another pause");
    } else {
      await showToast(Toast.Style.Success, "Pause updated");
    }
    return true;
  };

  const deletePause = async (index: number) => {
    const confirmed = await confirmAlert({
      title: "Delete pause?",
      message: "This will remove the pause entry.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed || !session) return;
    const next = [...(session.pauses ?? [])];
    next.splice(index, 1);
    await saveSessionPauses(next);
    await showToast(Toast.Style.Success, "Pause deleted");
  };

  const pauses = session?.pauses ?? [];
  const nowIso = now.toISOString();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter pauses">
      <List.Section title="Pauses" subtitle={`${pauses.length} pause(s)`}>
        {pauses.map((pause, index) => {
          const endIso = pause.end ?? nowIso;
          const duration = msBetween(pause.start, endIso);
          const title = `${formatTime(pause.start)} - ${pause.end ? formatTime(pause.end) : "Open"}`;
          const subtitle = `Duration ${msToClock(duration)}`;
          return (
            <List.Item
              key={`${pause.start}-${index}`}
              icon={Icon.Pause}
              title={title}
              subtitle={subtitle}
              accessories={[{ text: msToClock(duration) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Pause"
                    icon={Icon.Pencil}
                    target={
                      <PauseForm title="Edit Pause" initial={pause} onSave={(values) => updatePause(index, values)} />
                    }
                  />
                  <Action.Push
                    title="Add Pause"
                    icon={Icon.Plus}
                    target={<PauseForm title="Add Pause" onSave={addPause} />}
                  />
                  <Action
                    title="Delete Pause"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deletePause(index)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        title={session ? "No pauses" : "Session not found"}
        icon={Icon.Pause}
        actions={
          <ActionPanel>
            {session ? (
              <Action.Push
                title="Add Pause"
                icon={Icon.Plus}
                target={<PauseForm title="Add Pause" onSave={addPause} />}
              />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

function PauseForm({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial?: Pause;
  onSave: (values: PauseFormValues) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [start, setStart] = useState<Date>(initial ? new Date(initial.start) : new Date());
  const [hasEnd, setHasEnd] = useState(!!initial?.end);
  const [end, setEnd] = useState<Date>(initial?.end ? new Date(initial.end) : new Date());

  const handleSubmit = async () => {
    if (hasEnd && end.getTime() < start.getTime()) {
      await showToast(Toast.Style.Failure, "End time must be after start time");
      return;
    }
    const success = await onSave({ start, end: hasEnd ? end : undefined });
    if (success) pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Pause" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={title} text="Adjust the pause start and end times." />
      <Form.DatePicker
        id="start"
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        value={start}
        onChange={(value) => value && setStart(value)}
      />
      <Form.Checkbox id="hasEnd" label="Has End" value={hasEnd} onChange={setHasEnd} />
      {hasEnd ? (
        <Form.DatePicker
          id="end"
          title="End"
          type={Form.DatePicker.Type.DateTime}
          value={end}
          onChange={(value) => value && setEnd(value)}
        />
      ) : null}
    </Form>
  );
}
