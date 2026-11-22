import { Action, ActionPanel, Form, Toast, open, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createTask, getCurrentIteration, getIterations, getStories, workItemUrl } from "./api";

interface Values {
  title: string;
  iteration: string;
  parent: string;
  estimate: string;
  description: string;
  assignToMe: boolean;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function Command() {
  const { data: current } = useCachedPromise(getCurrentIteration);
  const { data: iterations } = useCachedPromise(getIterations);

  const { handleSubmit, itemProps, values, setValue, reset } = useForm<Values>({
    initialValues: { assignToMe: true },
    onSubmit: async (v) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      try {
        const t = await createTask({
          title: v.title.trim(),
          parentId: Number(v.parent),
          iterationPath: iterationPath ?? v.iteration,
          estimate: v.estimate.trim() ? Number(v.estimate.replace(",", ".")) : undefined,
          description: v.description.trim() ? escapeHtml(v.description).replace(/\n/g, "<br>") : undefined,
          assignToMe: v.assignToMe,
        });
        toast.style = Toast.Style.Success;
        toast.title = `Created #${t.id}`;
        reset({ title: "", estimate: "", description: "" });
        toast.primaryAction = { title: "Open in Azure DevOps", onAction: () => open(workItemUrl(t.id)) };
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    },
    validation: {
      title: FormValidation.Required,
      parent: FormValidation.Required,
      estimate: (value) => {
        if (!value?.trim()) return;
        const n = Number(value.replace(",", "."));
        if (!isFinite(n) || n < 0) return "Estimate must be a positive number";
      },
    },
  });

  const iterationPath = values.iteration || current?.path;
  const { data: stories, isLoading } = useCachedPromise(getStories, [iterationPath ?? ""], {
    execute: !!iterationPath,
  });

  // Keep the User Story selection valid for the chosen sprint (first story by default).
  useEffect(() => {
    if (stories && !stories.some((s) => String(s.id) === values.parent)) {
      setValue("parent", stories[0] ? String(stories[0].id) : "");
    }
  }, [stories]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Short summary of the task" {...itemProps.title} />
      <Form.Dropdown title="Sprint" {...itemProps.iteration} value={iterationPath ?? ""}>
        {(iterations ?? []).map((i) => (
          <Form.Dropdown.Item
            key={i.id}
            value={i.path}
            title={i.name + (i.timeFrame === "current" ? " (current)" : "")}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="User Story" {...itemProps.parent}>
        {(stories ?? []).map((s) => (
          <Form.Dropdown.Item key={s.id} value={String(s.id)} title={`#${s.id} · ${s.title}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Estimate (h)" placeholder="2" {...itemProps.estimate} />
      <Form.TextArea title="Description" placeholder="What needs to be done?" {...itemProps.description} />
      <Form.Checkbox label="Assign to me" {...itemProps.assignToMe} />
    </Form>
  );
}
