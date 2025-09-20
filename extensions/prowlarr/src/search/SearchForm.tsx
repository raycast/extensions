import { Action, ActionPanel, Form, getPreferenceValues } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { useCategories } from "./hooks/useCategories";
import { useIndexers } from "./hooks/useIndexers";
import { SearchFormValues, Sort } from "./types";

const preference = getPreferenceValues<Preferences.Search>();

export function SearchForm({ onSubmit }: Parameters<typeof useForm<SearchFormValues>>[0]) {
  const indexers = useIndexers();
  const categories = useCategories();
  const categoriesWithSubCategories = useMemo(
    () => categories.data?.flatMap((category) => [category, ...category.subCategories]),
    [categories.data],
  );

  const { handleSubmit, itemProps, values } = useForm<SearchFormValues>({
    validation: {
      search: FormValidation.Required,
      sort: FormValidation.Required,
    },
    onSubmit,
  });

  return (
    <Form
      isLoading={indexers.isLoading || categories.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Search" placeholder="Linux Mint" {...itemProps.search} />

      <Form.Dropdown title="Sort" storeValue {...(itemProps.sort as Form.Dropdown.Props)}>
        <Form.Dropdown.Section title="Peers">
          <Form.Dropdown.Item value={Sort.SeedsDesc} title={"Most seeds"} />
          <Form.Dropdown.Item value={Sort.SeedsAsc} title={"Least seeds"} />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Size">
          <Form.Dropdown.Item value={Sort.SizeDesc} title={"Biggest first"} />
          <Form.Dropdown.Item value={Sort.SizeAsc} title={"Smallest first"} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        {...(itemProps.allIndexers as Form.Checkbox.Props)}
        storeValue={preference.keepIndexerSelection}
        label="All Indexers"
      ></Form.Checkbox>

      {!indexers.isLoading && // Wait for the indexers to load, otherwise storeValue will not work
        !values.allIndexers && (
          <Form.TagPicker
            title="Indexers"
            storeValue={preference.keepIndexerSelection}
            {...(itemProps.indexerIds as Form.TagPicker.Props)}
          >
            {indexers.data?.map((indexer) => (
              <Form.TagPicker.Item key={indexer.id} value={indexer.id.toFixed()} title={indexer.name} />
            ))}
          </Form.TagPicker>
        )}

      {!categories.isLoading && ( // Wait for the categories to load, otherwise storeValue will not work
        <Form.TagPicker
          title="Categories"
          storeValue={preference.keepCategorySelection}
          {...(itemProps.categoryIds as Form.TagPicker.Props)}
        >
          {categoriesWithSubCategories?.map((category) => (
            <Form.TagPicker.Item key={category.id} value={category.id.toFixed()} title={category.name} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
