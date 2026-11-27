import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";

import { makeClient } from "../anydo/auth";
import { t } from "../anydo/i18n";
import {
  composeNote,
  normalizeTags,
  parseNote,
  priorityLabel,
  type Priority,
} from "../anydo/tags";
import type { AnyDoList, AnyDoTask } from "../anydo/types";
import { errorMessage } from "./feedback";

function ListDropdown({
  lists,
  defaultValue,
}: {
  lists: AnyDoList[];
  defaultValue: string;
}) {
  return (
    <Form.Dropdown
      id="list"
      title={t("لیست", "List")}
      defaultValue={defaultValue}
    >
      {lists.map((list) => (
        <Form.Dropdown.Item
          key={list.list_id}
          value={list.list_id}
          title={list.title}
        />
      ))}
    </Form.Dropdown>
  );
}

function PriorityDropdown({ defaultValue }: { defaultValue: Priority }) {
  return (
    <Form.Dropdown
      id="priority"
      title={t("اولویت", "Priority")}
      defaultValue={String(defaultValue)}
    >
      {([0, 1, 2, 3] as Priority[]).map((priority) => (
        <Form.Dropdown.Item
          key={priority}
          value={String(priority)}
          title={priorityLabel(priority)}
          icon={
            priority === 3
              ? Icon.ExclamationMark
              : priority === 2
                ? Icon.ArrowUp
                : priority === 1
                  ? Icon.ArrowDown
                  : Icon.Minus
          }
        />
      ))}
    </Form.Dropdown>
  );
}

/** Edit form: title, note text, the simulated tags/priority, and the list. */
export function EditTaskForm({
  task,
  lists,
  onSaved,
}: {
  task: AnyDoTask;
  lists: AnyDoList[];
  onSaved: () => void;
}) {
  const meta = parseNote(task.note);

  async function handleSubmit(values: {
    title: string;
    note: string;
    tags: string;
    priority: string;
    list: string;
  }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("عنوان خالی است", "The title cannot be empty"),
      });
      return;
    }

    const note = composeNote(
      values.note,
      normalizeTags(values.tags),
      Number(values.priority) as Priority,
    );
    const changes: { title?: string; note?: string; list_id?: string } = {};
    if (title !== task.title) changes.title = title;
    if (note !== (task.note ?? "")) changes.note = note;
    if (values.list && values.list !== task.list_id)
      changes.list_id = values.list;

    if (Object.keys(changes).length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: t("چیزی برای تغییر نبود", "Nothing to update"),
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("در حال ذخیره…", "Saving…"),
    });
    try {
      await makeClient().editTask(task, changes);
      toast.style = Toast.Style.Success;
      toast.title = t("ذخیره شد", "Saved");
      toast.message = undefined;
      onSaved();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t("ذخیره نشد", "Could not save");
      toast.message = errorMessage(error);
    }
  }

  return (
    <Form
      navigationTitle={t("ویرایش تسک", "Edit task")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("ذخیره", "Save")}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title={t("عنوان", "Title")}
        defaultValue={task.title}
      />
      <Form.TextArea
        id="note"
        title={t("نوت", "Note")}
        defaultValue={meta.text}
        placeholder={t("توضیح دلخواه", "optional")}
      />
      <Form.TextField
        id="tags"
        title={t("برچسب‌ها", "Tags")}
        defaultValue={meta.tags.map((tag) => `#${tag}`).join(" ")}
        placeholder={t("مثلاً: منزل کار فوری", "e.g. home work")}
      />
      <PriorityDropdown defaultValue={meta.priority} />
      <ListDropdown lists={lists} defaultValue={task.list_id} />
      <Form.Description
        text={t(
          "برچسب‌ها و اولویت داخل «نوت» ذخیره می‌شوند (API رسمی Any.do این دو فیلد را ندارد)، پس در خود اپ Any.do هم دیده می‌شوند.",
          "Tags and priority are stored inside the note (Any.do's API has no such fields), so they stay visible in the Any.do app too.",
        )}
      />
    </Form>
  );
}

export function AddSubtaskForm({
  task,
  onSaved,
}: {
  task: AnyDoTask;
  onSaved: () => void;
}) {
  async function handleSubmit(values: { subtask: string }) {
    const title = values.subtask.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("سابتسک عنوان ندارد", "The subtask needs a title"),
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("در حال افزودن…", "Adding…"),
    });
    try {
      await makeClient().addSubtask(task, title);
      toast.style = Toast.Style.Success;
      toast.title = t("سابتسک اضافه شد", "Subtask added");
      toast.message = title;
      onSaved();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t("افزودن سابتسک ناموفق بود", "Could not add the subtask");
      toast.message = errorMessage(error);
    }
  }

  return (
    <Form
      navigationTitle={t("افزودن سابتسک", "Add subtask")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("افزودن", "Add")}
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="subtask"
        title={t("سابتسک", "Subtask")}
        placeholder={`${t("مرحله‌ی تازه برای", "New step for")} «${task.title}»`}
      />
    </Form>
  );
}
