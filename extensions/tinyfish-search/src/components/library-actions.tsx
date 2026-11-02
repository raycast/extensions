import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { library } from "../library";
import type { SearchRecipe } from "../library-store";
import type { FetchOptions, FetchResult } from "../tinyfish";

export function SaveReadingAction({
  url,
  title,
  page,
  options,
}: {
  url: string;
  title: string;
  page?: FetchResult;
  options?: FetchOptions;
}) {
  return (
    <Action
      title={page ? "Save Content to Reading List" : "Save to Reading List"}
      icon={Icon.Bookmark}
      onAction={async () => {
        try {
          await library.saveReading({ url, title, page, options });
          await showToast({
            style: Toast.Style.Success,
            title: page ? "Saved for offline reading" : "Saved to reading list",
          });
        } catch (error) {
          await showFailureToast(error, { title: "Could not save page" });
        }
      }}
    />
  );
}

export function SaveSearchForm({
  recipe,
  initialTitle = recipe.query,
  onSaved,
}: {
  recipe: SearchRecipe;
  initialTitle?: string;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ title: string }>({
    initialValues: { title: initialTitle },
    async onSubmit({ title }) {
      try {
        await library.saveSearch(recipe, title);
        onSaved?.();
        await showToast({ style: Toast.Style.Success, title: "Search saved" });
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not save search" });
      }
    },
  });
  return (
    <Form
      navigationTitle="Save Search"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Search" icon={Icon.Bookmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.title} />
      <Form.Description title="Query" text={recipe.query} />
      <Form.Description
        title="Filters"
        text="The current filters, search purpose, country, and language will be saved with this search."
      />
    </Form>
  );
}
