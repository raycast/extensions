import { Action, ActionPanel, Form, Toast, open, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { createTask, getCurrentIteration, getIterations, getStories, workItemUrl } from "./api";

export default function Command() {
  const [error, setError] = useState<string>();
  const { data: current } = useCachedPromise(getCurrentIteration);
  const { data: iterations } = useCachedPromise(getIterations);
  const [path, setPath] = useState<string>();
  const iterationPath = path ?? current?.path;
  const { data: stories, isLoading } = useCachedPromise(getStories, [iterationPath ?? ""], {
    execute: !!iterationPath,
  });

  async function submit(v: {
    title: string;
    parent: string;
    iteration: string;
    estimate: string;
    description: string;
    assignToMe: boolean;
  }) {
    if (!v.title.trim()) return setError("Title is required");
    if (!v.parent) return setError("Select a User Story");
    const estimate = v.estimate ? Number(v.estimate.replace(",", ".")) : undefined;
    if (estimate !== undefined && !isFinite(estimate)) return setError("Estimate must be a number");
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
    try {
      const t = await createTask({
        title: v.title.trim(),
        parentId: Number(v.parent),
        iterationPath: v.iteration,
        estimate,
        description: v.description.trim() ? v.description.replace(/\n/g, "<br>") : undefined,
        assignToMe: v.assignToMe,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Created #${t.id}`;
      toast.primaryAction = { title: "Open in Azure DevOps", onAction: () => open(workItemUrl(t.id)) };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" error={error} onChange={() => setError(undefined)} />
      <Form.Dropdown id="iteration" title="Sprint" value={iterationPath} onChange={setPath}>
        {(iterations ?? []).map((i) => (
          <Form.Dropdown.Item
            key={i.id}
            value={i.path}
            title={i.name + (i.timeFrame === "current" ? " (current)" : "")}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="parent" title="User Story">
        {(stories ?? []).map((s) => (
          <Form.Dropdown.Item key={s.id} value={String(s.id)} title={`#${s.id} · ${s.title}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="estimate" title="Estimate (h)" placeholder="2" />
      <Form.TextArea id="description" title="Description" />
      <Form.Checkbox id="assignToMe" label="Assign to me" defaultValue={true} />
    </Form>
  );
}
