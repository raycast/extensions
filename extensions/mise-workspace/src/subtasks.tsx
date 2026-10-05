import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { getTask, updateTask } from "./api";
import { getConfig } from "./preferences";
import type { Subtask, TaskLite } from "./types";

export default function ManageSubtasks(props: { task: TaskLite; onChanged?: () => void }) {
  const { task, onChanged } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [subtasks, setSubtasks] = useState<Subtask[]>(() => task.subtasks || []);

  const cfg = getConfig();

  useEffect(() => {
    void (async () => {
      try {
        const fresh = await getTask(cfg, task._id);
        setSubtasks(Array.isArray(fresh.subtasks) ? fresh.subtasks : []);
      } catch {
        // fall back to existing
      } finally {
        setIsLoading(false);
      }
    })();
  }, [task._id]);

  async function applySubtasks(mutate: (current: Subtask[]) => Subtask[], successTitle: string) {
    // Mutate the server's latest list, not the rendered snapshot, so edits
    // made elsewhere while this view is open aren't overwritten. Abort when
    // the latest list can't be fetched rather than write from a stale one.
    let base: Subtask[];
    try {
      const fresh = await getTask(cfg, task._id);
      base = Array.isArray(fresh.subtasks) ? fresh.subtasks : [];
    } catch {
      return; /* fetch errors are already toasted by api */
    }
    const next = mutate(base);
    await updateTask(cfg, { taskId: task._id, subtasks: next });
    setSubtasks(next);
    await showToast({ style: Toast.Style.Success, title: successTitle });
    try {
      onChanged?.();
    } catch {
      /* ignore */
    }
  }

  const completedCount = useMemo(() => subtasks.filter((s) => s.completed).length, [subtasks]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter subtasks">
      <List.Section title={`Subtasks (${completedCount}/${subtasks.length})`}>
        <List.Item
          key="__add_subtask__"
          title="Add Subtask"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Subtask"
                icon={Icon.Plus}
                target={<AddSubtask taskId={task._id} onSaved={setSubtasks} onChanged={onChanged} />}
              />
            </ActionPanel>
          }
        />
        {subtasks.map((s) => (
          <List.Item
            key={s.id}
            title={s.text || "Untitled"}
            icon={s.completed ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={s.completed ? "Mark Incomplete" : "Mark Complete"}
                  icon={s.completed ? Icon.Circle : Icon.CheckCircle}
                  onAction={async () => {
                    await applySubtasks(
                      (list) => list.map((x) => (x.id === s.id ? { ...x, completed: !x.completed } : x)),
                      s.completed ? "Marked incomplete" : "Marked complete",
                    );
                  }}
                />
                <Action.Push
                  title="Edit Text"
                  icon={Icon.Pencil}
                  target={<EditSubtask taskId={task._id} initial={s} onSaved={setSubtasks} onChanged={onChanged} />}
                />
                <Action
                  title="Remove Subtask"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={async () => {
                    await applySubtasks((list) => list.filter((x) => x.id !== s.id), "Subtask removed");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function AddSubtask(props: { taskId: string; onSaved: (next: Subtask[]) => void; onChanged?: () => void }) {
  const { taskId, onSaved, onChanged } = props;
  async function handleSubmit(values: { text: string }) {
    const text = (values.text || "").trim();
    if (!text) return;
    // Re-fetch before appending so a stale captured list can't clobber
    // subtask edits made elsewhere while this form was open. Abort when the
    // latest list can't be fetched rather than write from a stale one.
    let base: Subtask[];
    try {
      const fresh = await getTask(getConfig(), taskId);
      base = Array.isArray(fresh.subtasks) ? fresh.subtasks : [];
    } catch {
      return; /* fetch errors are already toasted by api */
    }
    const next: Subtask[] = [
      ...base,
      {
        id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        completed: false,
      },
    ];
    try {
      await updateTask(getConfig(), { taskId, subtasks: next });
      onSaved(next);
      await showToast({ style: Toast.Style.Success, title: "Subtask added" });
      try {
        onChanged?.();
      } catch {
        /* ignore */
      }
    } catch {
      /* errors are already toasted by api */
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" icon={Icon.Plus} onSubmit={handleSubmit as any} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" placeholder="Describe the subtask" autoFocus />
    </Form>
  );
}

function EditSubtask(props: {
  taskId: string;
  initial: Subtask;
  onSaved: (next: Subtask[]) => void;
  onChanged?: () => void;
}) {
  const { taskId, initial, onSaved, onChanged } = props;
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const fresh = await getTask(getConfig(), taskId);
        setSubtasks(Array.isArray(fresh.subtasks) ? fresh.subtasks : []);
      } catch {
        setSubtasks([]);
      }
    })();
  }, [taskId]);

  async function handleSubmit(values: { text: string }) {
    if (!subtasks) return;
    setLoading(true);
    const text = (values.text || "").trim();
    // Re-fetch before mapping so a list captured at form load can't clobber
    // subtask changes made elsewhere in the meantime. Abort when the latest
    // list can't be fetched rather than write from a stale one.
    let base: Subtask[];
    try {
      const fresh = await getTask(getConfig(), taskId);
      base = Array.isArray(fresh.subtasks) ? fresh.subtasks : [];
    } catch {
      setLoading(false);
      return; /* fetch errors are already toasted by api */
    }
    const next = base.map((s) => (s.id === initial.id ? { ...s, text } : s));
    try {
      await updateTask(getConfig(), { taskId, subtasks: next });
      onSaved(next);
      await showToast({ style: Toast.Style.Success, title: "Subtask updated" });
      try {
        onChanged?.();
      } catch {
        /* ignore */
      }
    } catch {
      /* errors are already toasted by api */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={subtasks === null || loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Checkmark} onSubmit={handleSubmit as any} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" defaultValue={initial.text} />
    </Form>
  );
}
