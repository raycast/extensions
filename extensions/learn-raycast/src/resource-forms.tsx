import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { updateLearnTags } from "./learn-cli.js";
import {
  EMPTY_FILTERS,
  parseTags,
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  type LearnResource,
  type ResourceFilters,
} from "./resources.js";

export function EditTagsForm({
  resource,
  workspace,
  executable,
  onSaved,
}: {
  resource: LearnResource;
  workspace: string;
  executable: string;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  async function submit(values: { tags: string }) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await updateLearnTags(
        workspace,
        resource,
        parseTags(values.tags),
        executable,
      );
      await showToast({ style: Toast.Style.Success, title: "Tags updated" });
      await onSaved();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update tags",
        message: (error as Error).message,
      });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <Form
      isLoading={loading}
      navigationTitle="Edit Resource Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tags" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={resource.title || resource.source} />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={resource.tags.join(", ")}
        info="Separate tags with commas. Leave empty to remove all tags."
      />
    </Form>
  );
}

export function ResourceFiltersForm({
  filters,
  tags,
  onApply,
}: {
  filters: ResourceFilters;
  tags: string[];
  onApply: (filters: ResourceFilters) => void;
}) {
  return (
    <Form
      navigationTitle="Filter Resources"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={onApply} />
          <Action
            title="Clear Filters"
            onAction={() => onApply(EMPTY_FILTERS)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="status" title="Status" defaultValue={filters.status}>
        <Form.Dropdown.Item value="" title="All Statuses" />
        {RESOURCE_STATUSES.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Type" defaultValue={filters.type}>
        <Form.Dropdown.Item value="" title="All Types" />
        {RESOURCE_TYPES.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="tag" title="Tag" defaultValue={filters.tag}>
        <Form.Dropdown.Item value="" title="All Tags" />
        {tags.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
