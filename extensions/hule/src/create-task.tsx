import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { PRIORITY_LABELS, createTask, taskUrl, webBase } from "./api/client";
import { ConnectionError } from "./components/ConnectionError";
import { toFloatingDay } from "./helpers/dates";
import { inboxListIds } from "./helpers/inboxes";
import { useHule } from "./hooks/useHule";
import { PRIORITIES, type Priority } from "./api/types";
import { listIcon, memberIcon, priorityIcon } from "./helpers/appearance";

interface FormValues {
  listId: string;
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string;
}

/**
 * What Quick Add hands over when it has no Quick capture list to write to
 * (H-1199): the title already typed, and the reason the form opened.
 */
export interface CreateTaskLaunch {
  title?: string;
  noQuickCapture?: boolean;
}

export default function Command(props: LaunchProps<{ launchContext?: CreateTaskLaunch }>) {
  const launch = props.launchContext;
  const { data: context, isLoading, error, revalidate } = useHule();
  const workspaces = context?.bundle.workspaces ?? [];
  const { data: inboxIds, isLoading: inboxesLoading } = useCachedPromise(inboxListIds, [workspaces], {
    execute: workspaces.length > 0,
  });

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
      try {
        const task = await createTask(values.listId, {
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          priority: values.priority as Priority,
          assigneeId: values.assigneeId || undefined,
          // `allDay` only with a date: sent alone it asks for the date-field
          // permission on a task that has no date.
          ...(values.dueDate ? { dueDate: toFloatingDay(values.dueDate), allDay: true } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Task created";
        toast.message = task.title;
        toast.primaryAction = {
          title: "Open in Hule",
          onAction: () => open(taskUrl(task)),
        };
        await popToRoot();
      } catch (cause) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create the task";
        toast.message = cause instanceof Error ? cause.message : String(cause);
      }
    },
    validation: { title: FormValidation.Required, listId: FormValidation.Required },
    initialValues: { priority: "none", title: launch?.title ?? "" },
  });

  // Your Inbox lists, one per workspace that has one, offered first — the
  // Telegram bot's buttons when no Quick capture list is set. Each shows once,
  // here, and not again in its workspace's section: two items with one value
  // would both draw as chosen.
  const inboxLists = useMemo(
    () => (context?.openLists ?? []).filter((list) => inboxIds?.includes(list.id)),
    [context, inboxIds],
  );
  const inboxSet = useMemo(() => new Set(inboxLists.map((list) => list.id)), [inboxLists]);
  const severalWorkspaces = workspaces.length > 1;

  // A dropdown with no value of its own still DRAWS its first item as chosen, so
  // without this the form would look filled in and refuse to submit ("List is
  // required") on a field the user can see an answer in. The lists arrive after
  // the first render, hence the effect rather than an initial value. The first
  // Inbox list wins once the GTD settings answer — but never over a list the
  // user picked, even the one this effect had chosen (`picked`, set by the
  // dropdown's own change, not by `setValue`).
  const picked = useRef(false);
  useEffect(() => {
    const preferred = inboxLists[0] ?? context?.openLists[0];
    if (!preferred || picked.current || preferred.id === values.listId) return;
    setValue("listId", preferred.id);
  }, [context, inboxLists, values.listId, setValue]);
  const listField = {
    ...itemProps.listId,
    onChange: (next: string) => {
      // The dropdown may echo the value the effect just set, and may report
      // the item it draws before the effect has run; only a change away from a
      // value already set is the user's pick.
      if (values.listId && next !== values.listId) picked.current = true;
      itemProps.listId.onChange?.(next);
    },
  };

  const workspaceId = context?.listOf(values.listId)?.workspaceId;
  const members = useMemo(() => (workspaceId ? (context?.membersOf(workspaceId) ?? []) : []), [context, workspaceId]);

  // Switching the list to another workspace leaves the old assignee in the
  // form's state while the dropdown, which has no such person, draws "Nobody" —
  // the submit would then send someone the user no longer sees. Clear it.
  useEffect(() => {
    if (values.assigneeId && !members.some((m) => m.id === values.assigneeId)) setValue("assigneeId", "");
  }, [members, values.assigneeId, setValue]);

  if (error) return <ConnectionError message={error.message} onRetry={revalidate} />;

  return (
    <Form
      isLoading={isLoading || inboxesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
          {launch?.noQuickCapture && (
            <Action.OpenInBrowser title="Set Quick Capture List in Hule" url={`${webBase()}/?settings=account`} />
          )}
        </ActionPanel>
      }
    >
      {launch?.noQuickCapture && (
        <Form.Description text="Quick Add has no Quick capture list to write to — none is set, or you can no longer add tasks to it — so pick a list for this one. To skip this step next time, choose a Quick capture list in Hule." />
      )}

      <Form.Dropdown {...listField} title="List" filtering={{ keepSectionOrder: true }}>
        {inboxLists.length > 0 && (
          <Form.Dropdown.Section title="Inbox Lists">
            {inboxLists.map((list) => (
              <Form.Dropdown.Item
                key={list.id}
                value={list.id}
                title={severalWorkspaces ? `${context?.workspaceOf(list.id)?.name ?? ""} / ${list.name}` : list.name}
                icon={listIcon(list)}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {workspaces.map((workspace) => (
          <Form.Dropdown.Section key={workspace.id} title={workspace.name}>
            {(context?.openLists ?? [])
              .filter((list) => list.workspaceId === workspace.id && !inboxSet.has(list.id))
              .map((list) => (
                <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} icon={listIcon(list)} />
              ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.TextField {...itemProps.title} title="Title" placeholder="What needs doing?" />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Optional details" />

      <Form.Dropdown {...itemProps.priority} title="Priority">
        {PRIORITIES.map((priority) => (
          <Form.Dropdown.Item
            key={priority}
            value={priority}
            title={PRIORITY_LABELS[priority]}
            icon={priorityIcon(priority)}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker {...itemProps.dueDate} title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.Dropdown {...itemProps.assigneeId} title="Assignee">
        <Form.Dropdown.Item value="" title="Nobody" icon={Icon.MinusCircle} />
        {members.map((member) => (
          <Form.Dropdown.Item
            key={member.id}
            value={member.id}
            title={member.name ?? member.email ?? member.id}
            icon={memberIcon(member)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
