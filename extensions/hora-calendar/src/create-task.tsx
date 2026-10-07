import { Action, ActionPanel, Form, Toast, closeMainWindow, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { showFailure } from "./feedback";
import { HoraNotInstalledError, HoraOutdatedError, addTask, listTaskLists } from "./hora";
import { HoraRequired } from "./hora-required";

/**
 * A form rather than a root-search argument, because the list picker has to be
 * filled from whatever lists hora has synced — Raycast's dropdown arguments
 * only take values hard-coded in the manifest.
 */
export default function Command() {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();

  const {
    data: lists,
    isLoading,
    error,
  } = useCachedPromise(listTaskLists, [], {
    initialData: [],
    // Anything that is not "you need hora" gets a toast; the two that are get
    // the whole screen below.
    onError: (failure) => {
      if (failure instanceof HoraNotInstalledError || failure instanceof HoraOutdatedError) return;
      showFailure(failure, "Could not read your task lists");
    },
  });

  if (error instanceof HoraNotInstalledError) return <HoraRequired reason="missing" />;
  if (error instanceof HoraOutdatedError) return <HoraRequired reason="outdated" />;

  async function submit(values: { title: string; listSelection: string; due: Date | null; notes: string }) {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Give the task a title");
      return;
    }

    const selectedList = lists.find((list) => taskListValue(list) === values.listSelection);
    if (values.listSelection && !selectedList) {
      await showFailure(new Error("Refresh the command and select a task list again."), "Task list unavailable");
      return;
    }

    setIsSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding task…" });
    try {
      const task = await addTask({
        title,
        due: values.due ?? undefined,
        listName: selectedList?.name,
        listID: selectedList?.id,
        accountEmail: selectedList?.accountEmail,
        notes: values.notes.trim() || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = task.title;
      toast.message = `Added to ${task.listName}`;
      await closeMainWindow();
      pop();
    } catch (failure) {
      await showFailure(failure, "Could not add the task");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task"
        placeholder="Send the invoice"
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.Dropdown id="listSelection" title="List">
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={taskListValue(list)}
            value={taskListValue(list)}
            title={`${list.name} — ${list.accountEmail}`}
          />
        ))}
      </Form.Dropdown>
      {/* Google Tasks records the day only, so there is no time picker here. */}
      <Form.DatePicker id="due" title="Due" type={Form.DatePicker.Type.Date} />
      <Form.TextArea id="notes" title="Notes" placeholder="Anything worth remembering" />
    </Form>
  );
}

function taskListValue(list: { id: string; accountEmail: string }): string {
  return JSON.stringify([list.accountEmail, list.id]);
}
