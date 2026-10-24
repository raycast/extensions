import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

export type SearchFilters = { tag?: string; savedSince?: number };

export function SearchFiltersForm({
  filters,
  onApply,
}: {
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Filter Saves"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Filters"
            onSubmit={(values: { tag: string; savedSince: Date | null }) => {
              onApply({ tag: values.tag.trim() || undefined, savedSince: values.savedSince?.getTime() });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tag"
        title="Tag"
        placeholder="e.g. inspiration"
        defaultValue={filters.tag}
        info="Match this exact tag alongside your search and source filter."
      />
      <Form.DatePicker
        id="savedSince"
        title="Saved Since"
        type={Form.DatePicker.Type.Date}
        defaultValue={filters.savedSince === undefined ? null : new Date(filters.savedSince)}
      />
    </Form>
  );
}
