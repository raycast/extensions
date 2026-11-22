import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { addComment, getIterations, getStates, logHours, setIteration, setState } from "../api";
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
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    onSubmit: (v) => run("Posting comment…", () => addComment(item.id, v.text), onDone, pop),
    validation: { text: FormValidation.Required },
  });
  return (
    <Form
      navigationTitle={`#${item.id} · Add comment`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Comment" placeholder="Write a comment…" {...itemProps.text} />
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
      <Form.Dropdown key={iterations ? "ready" : "loading"} id="path" title="Sprint" defaultValue={item.iterationPath}>
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
  const { handleSubmit, itemProps } = useForm<{ add: string }>({
    // Hours are added on top of the latest totals in Azure DevOps, not the ones loaded with the list.
    onSubmit: (v) => run("Logging hours…", () => logHours(item.id, Number(v.add.replace(",", "."))), onDone, pop),
    validation: {
      add: (value) => {
        const n = Number((value ?? "").replace(",", "."));
        if (!value?.trim()) return "Enter the hours to log";
        if (!isFinite(n) || n <= 0) return "Enter a positive number of hours";
      },
    },
  });
  return (
    <Form
      navigationTitle={`#${item.id} · Log hours`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Hours" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current"
        text={`Completed ${item.completed ?? 0}h · Remaining ${item.remaining ?? item.estimate ?? 0}h`}
      />
      <Form.TextField title="Hours to add" placeholder="1.5" {...itemProps.add} />
    </Form>
  );
}
