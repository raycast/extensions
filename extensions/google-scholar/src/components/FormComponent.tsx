import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { Cache } from "../utils/cache"; // Adjusted path
import type { SearchParams } from "../search-articles"; // Adjusted path for type
import { SearchResultsComponent } from "./SearchResultsComponent"; // Adjusted path

export function FormComponent() {
  const { push } = useNavigation();

  const handleSubmit = async (values: SearchParams) => {
    // The SearchParams type now includes sortBy, but the form doesn't set it directly.
    // We can either add a sort by to the form, or let SearchResultsComponent default it.
    // For now, SearchResultsComponent handles default sortBy if not provided.
    push(<SearchResultsComponent searchParams={values} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={handleSubmit} />
          <Action
            title="Clear Cache"
            onAction={async () => {
              Cache.clear();
              await showToast({ title: "Cache cleared", style: Toast.Style.Success });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }} // Example shortcut
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Find articles with..." />
      <Form.TextField id="allWords" title="All Words" placeholder="e.g., machine learning" />
      <Form.TextField id="exactPhrase" title="Exact Phrase" placeholder="e.g., deep learning" />
      <Form.TextField id="atLeastOne" title="At Least One of the Words" placeholder="e.g., neural network" />
      <Form.TextField id="withoutWords" title="Without the Words" placeholder="e.g., survey" />
      <Form.Separator />
      <Form.Description text="Where words occur" />
      <Form.Dropdown id="wordOccurrence" title="Word Occurrence" defaultValue="any">
        <Form.Dropdown.Item value="any" title="Anywhere in the article" />
        <Form.Dropdown.Item value="title" title="In the title of the article" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="authors" title="Authored By" placeholder="e.g., John Doe" />
      <Form.TextField id="publication" title="Published In" placeholder="e.g., Nature" />
      <Form.Separator />
      <Form.Description text="Date between" />
      <Form.TextField id="startYear" title="From" placeholder="e.g., 2000" />
      <Form.TextField id="endYear" title="To" placeholder="e.g., 2023" />
    </Form>
  );
}
