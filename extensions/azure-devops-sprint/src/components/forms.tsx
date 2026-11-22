import { Action, ActionPanel, Form, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { addComment, getIterations, getStates, setHours, setIteration, setState } from "../api";
import { WorkItem } from "../types";

interface Props {
  item: WorkItem;
  onDone: () => void;
}

async function run(title: string, fn: () => Promise<unknown>, onDone: () => void, pop: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await fn();
    toast.style = Toast.Style.Success;
    toast.title = "Done";
    onDone();
    pop();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

export function ChangeStateForm({ item, onDone }: Props) {
  const { pop } = useNavigation();
  const { data: states, isLoading } = useCachedPromise(getStates, [item.type]);
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`#${item.id} · Change status`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Status"
            onSubmit={(v: { state: string }) => run("Updating status…", () => setState(item.id, v.state), onDone, pop)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="state" title="Status" defaultValue={item.state}>
        {(states ?? [item.state]).map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={s} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function CommentForm({ item, onDone }: Props) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle={`#${item.id} · Add comment`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Post Comment"
            onSubmit={(v: { text: string }) => {
              if (!v.text.trim()) return setError("Write a comment first");
              return run("Posting comment…", () => addComment(item.id, v.text), onDone, pop);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Comment"
        placeholder="Write a comment…"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

export function MoveSprintForm({ item, onDone }: Props) {
  const { pop } = useNavigation();
  const { data: iterations, isLoading } = useCachedPromise(getIterations);
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`#${item.id} · Move to sprint`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Move Work Item"
            onSubmit={(v: { path: string }) => run("Moving…", () => setIteration(item.id, v.path), onDone, pop)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="path" title="Sprint" defaultValue={item.iterationPath}>
        {(iterations ?? []).map((i) => (
          <Form.Dropdown.Item
            key={i.id}
            value={i.path}
            title={i.name + (i.timeFrame === "current" ? " (current)" : "")}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function LogHoursForm({ item, onDone }: Props) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle={`#${item.id} · Log hours`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Log Hours"
            onSubmit={(v: { add: string }) => {
              const add = Number(v.add.replace(",", "."));
              if (!isFinite(add) || add <= 0) return setError("Enter a positive number of hours");
              const completed = (item.completed ?? 0) + add;
              const remaining = Math.max(0, (item.remaining ?? item.estimate ?? 0) - add);
              return run("Logging hours…", () => setHours(item.id, completed, remaining), onDone, pop);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current"
        text={`Completed ${item.completed ?? 0}h · Remaining ${item.remaining ?? item.estimate ?? 0}h`}
      />
      <Form.TextField
        id="add"
        title="Hours to add"
        placeholder="1.5"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

export { popToRoot };
