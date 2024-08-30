import { Action, ActionPanel, Form, getPreferenceValues } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SearchFormValues, Sort } from "./types";

const preference = getPreferenceValues<Preferences.Search>();

export function SearchForm({ onSubmit }: Parameters<typeof useForm<SearchFormValues>>[0]) {
  const { handleSubmit, itemProps } = useForm<SearchFormValues>({
    initialValues: {
      sort: Sort[preference.defaultSort],
    },
    validation: {
      search: FormValidation.Required,
      sort: FormValidation.Required,
    },
    onSubmit,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Search" placeholder="Linux Mint" {...itemProps.search} />
      <Form.Dropdown title="Sort" {...(itemProps.sort as Form.Dropdown.Props)}>
        <Form.Dropdown.Section title="Peers">
          <Form.Dropdown.Item value={Sort.SeedsDesc} title={"Most seeds"} />
          <Form.Dropdown.Item value={Sort.SeedsAsc} title={"Least seeds"} />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Size">
          <Form.Dropdown.Item value={Sort.SizeDesc} title={"Biggest first"} />
          <Form.Dropdown.Item value={Sort.SizeAsc} title={"Smallest first"} />
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
