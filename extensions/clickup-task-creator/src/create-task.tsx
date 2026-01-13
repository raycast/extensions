import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useState } from "react";
import { ClickUpAPI } from "./api/clickup";
import { Preferences, Priority, TASK_TAGS } from "./types";

export default function CreateTask() {
  const preferences = getPreferenceValues<Preferences>();
  const api = new ClickUpAPI(preferences);

  const [listId, setListId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<string>(String(Priority.Normal));
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Cache lists from ClickUp
  const {
    data: lists,
    isLoading: isLoadingLists,
    error: listsError,
  } = useCachedPromise(async () => {
    return await api.getLists();
  });

  // Cache workspace members from ClickUp
  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useCachedPromise(async () => {
    return await api.getWorkspaceMembers();
  });

  async function handleSubmit() {
    if (!listId) {
      showToast({
        style: Toast.Style.Failure,
        title: "List Required",
        message: "Please select a list",
      });
      return;
    }

    if (!title.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Title Required",
        message: "Please enter a task title",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: title.trim(),
        description: description.trim() || undefined,
        priority: Number(priority) as Priority,
        assignees: assigneeId ? [Number(assigneeId)] : undefined,
        tags: tags,
      };

      await api.createTask(listId, payload);

      showToast({
        style: Toast.Style.Success,
        title: "Task Created",
        message: `"${title}" has been added to ClickUp`,
      });

      // Reset form
      setListId("");
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority(String(Priority.Normal));
      setTags([]);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show error if API calls failed
  if (listsError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Lists",
      message: listsError.message,
    });
  }

  if (membersError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Members",
      message: membersError.message,
    });
  }

  return (
    <Form
      isLoading={isLoadingLists || isLoadingMembers || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="list"
        title="List"
        placeholder="Select a list"
        value={listId}
        onChange={setListId}
        storeValue
      >
        {lists?.map((list) => {
          const parentName = list.folder?.name || list.space?.name;
          const displayTitle = parentName
            ? `${list.name} (${parentName})`
            : list.name;

          return (
            <Form.Dropdown.Item
              key={list.id}
              value={list.id}
              title={displayTitle}
            />
          );
        })}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter task title"
        value={title}
        onChange={setTitle}
        autoFocus
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter task description (optional)"
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown
        id="assignee"
        title="Assignee"
        placeholder="Select assignee (optional)"
        value={assigneeId}
        onChange={setAssigneeId}
        storeValue
      >
        <Form.Dropdown.Item value="" title="Unassigned" />
        {members?.map((member) => (
          <Form.Dropdown.Item
            key={member.user.id}
            value={String(member.user.id)}
            title={member.user.username}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        placeholder="Select priority"
        value={priority}
        onChange={setPriority}
        storeValue
      >
        <Form.Dropdown.Item value={String(Priority.Urgent)} title="🔴 Urgent" />
        <Form.Dropdown.Item value={String(Priority.High)} title="🟡 High" />
        <Form.Dropdown.Item value={String(Priority.Normal)} title="🔵 Normal" />
        <Form.Dropdown.Item value={String(Priority.Low)} title="⚪ Low" />
      </Form.Dropdown>

      <Form.TagPicker
        id="tags"
        title="Tags"
        placeholder="Select tags"
        value={tags}
        onChange={setTags}
      >
        {TASK_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
