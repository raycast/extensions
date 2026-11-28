import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { addComment, getIterations, getWorkItems, logHours, setIteration } from "../../lib/sprint-api";
import { ItemRef } from "../../lib/sprint-types";

interface Props {
  item: ItemRef;
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

export function CommentForm({ item, onDone }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    onSubmit: (v) => run("Posting comment…", () => addComment(item.id, item.project, v.text), onDone, pop),
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
  // Show the latest totals, not the ones loaded with the list.
  const { data: fresh, isLoading } = useCachedPromise(async (id: number) => (await getWorkItems([id]))[0], [item.id]);
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
      isLoading={isLoading}
      navigationTitle={`#${item.id} · Log hours`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Hours" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current"
        text={
          fresh
            ? `Completed ${fresh.completed ?? 0}h · Remaining ${fresh.remaining ?? fresh.estimate ?? 0}h`
            : "Loading…"
        }
      />
      <Form.TextField title="Hours to add" placeholder="1.5" {...itemProps.add} />
    </Form>
  );
}
