import { Form, LocalStorage, ActionPanel, Action } from "@raycast/api";
import { TRIGGER_FILTERS_KEY } from "../utils/constants";
import { useEffect, useState } from "react";
import { getAllTagsAPI } from "../utils/n8n-api-utils";

export default function TriggerFilterForm() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    async function loadFilters() {
      const storedTags = await LocalStorage.getItem<string[]>(TRIGGER_FILTERS_KEY);
      const tags = await getTags();
      setAvailableTags(tags);
      setSelectedTags(storedTags || []);
    }
    loadFilters();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Filters"
            onSubmit={async (values) => {
              await LocalStorage.setItem(TRIGGER_FILTERS_KEY, values.tags);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="tags"
        title="Filter by Tags"
        value={selectedTags}
        onChange={setSelectedTags}
      >
        {availableTags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}