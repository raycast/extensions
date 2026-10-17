import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchLists, fetchTags, getReadableErrorMessage, isAbortError } from "../linkace-api";
import {
  DEFAULT_SEARCH_FILTERS,
  SORT_ORDER_OPTIONS,
  VISIBILITY_OPTIONS,
  type LinkAceList,
  type LinkAceTag,
  type SearchFilters,
} from "../types";

type Props = {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
};

type FormValues = SearchFilters;

export function SearchFiltersForm({ baseUrl, apiKey, proxyUrl, filters, onApply }: Props) {
  const { pop } = useNavigation();
  const [lists, setLists] = useState<LinkAceList[]>([]);
  const [tags, setTags] = useState<LinkAceTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadFilterOptions() {
      setIsLoading(true);

      try {
        const [listsResponse, tagsResponse] = await Promise.all([
          fetchLists({ baseUrl, apiKey, proxyUrl, signal: abortController.signal }),
          fetchTags({ baseUrl, apiKey, proxyUrl, signal: abortController.signal }),
        ]);

        setLists(Array.isArray(listsResponse.data) ? listsResponse.data : []);
        setTags(Array.isArray(tagsResponse.data) ? tagsResponse.data : []);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load Filters",
          message: getReadableErrorMessage(error, proxyUrl),
        });
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadFilterOptions();

    return () => {
      abortController.abort();
    };
  }, [apiKey, baseUrl, proxyUrl]);

  function applyFilters(values: FormValues) {
    onApply({
      ...values,
      selectedListIds: values.emptyLists ? [] : values.selectedListIds,
      selectedTagIds: values.emptyTags ? [] : values.selectedTagIds,
    });
    pop();
  }

  function resetFilters() {
    onApply(DEFAULT_SEARCH_FILTERS);
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Search Filters"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={applyFilters} icon={Icon.CheckCircle} />
          <Action title="Reset Filters" onAction={resetFilters} icon={Icon.ArrowCounterClockwise} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="searchTitle" label="Search Titles" defaultValue={filters.searchTitle} storeValue={false} />
      <Form.Checkbox
        id="searchDescription"
        label="Search Descriptions"
        defaultValue={filters.searchDescription}
        storeValue={false}
      />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue={filters.visibility} storeValue={false}>
        {VISIBILITY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="sortOrder" title="Sort Order" defaultValue={filters.sortOrder} storeValue={false}>
        {SORT_ORDER_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="brokenOnly" label="Only Broken Links" defaultValue={filters.brokenOnly} storeValue={false} />
      <Form.Checkbox
        id="emptyLists"
        label="Only Links Without Lists"
        defaultValue={filters.emptyLists}
        storeValue={false}
      />
      <Form.TagPicker
        id="selectedListIds"
        title="Lists"
        info="Optional. Restrict results to links that belong to the selected lists."
        defaultValue={filters.selectedListIds}
        placeholder="Select lists"
        storeValue={false}
      >
        {lists.map((list) => (
          <Form.TagPicker.Item key={list.id} value={String(list.id)} title={list.name} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox
        id="emptyTags"
        label="Only Links Without Tags"
        defaultValue={filters.emptyTags}
        storeValue={false}
      />
      <Form.TagPicker
        id="selectedTagIds"
        title="Tags"
        info="Optional. Restrict results to links that have the selected tags."
        defaultValue={filters.selectedTagIds}
        placeholder="Select tags"
        storeValue={false}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={String(tag.id)} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
