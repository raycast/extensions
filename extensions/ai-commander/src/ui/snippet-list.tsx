import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { errorMessage } from "../core/errors";
import type { TextSnippet } from "../core/types";
import { createSnippet, deleteSnippet, getSnippets, updateSnippet } from "../prompts/store";
import { isQuotableSnippetName, snippetPlaceholder, UNQUOTABLE_SNIPPET_NAME } from "../prompts/template/snippets";
import { validateSnippetText } from "../prompts/template/validate";
import { guarded, showError } from "./feedback";

function SnippetForm({ snippet, onSaved }: { snippet?: TextSnippet; onSaved: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string; text: string }>({
    initialValues: { name: snippet?.name ?? "", text: snippet?.text ?? "" },
    validation: {
      name: (value) => {
        if (!value?.trim()) return "Required";
        return isQuotableSnippetName(value) ? undefined : UNQUOTABLE_SNIPPET_NAME;
      },
      text: (value) => {
        if (!value?.trim()) return "Required";
        return validateSnippetText(value).errors[0]?.message;
      },
    },
    onSubmit: async ({ name, text }) => {
      try {
        if (snippet) await updateSnippet(snippet.id, { name: name.trim(), text });
        else await createSnippet({ name: name.trim(), text });
        await onSaved();
        pop();
      } catch (error) {
        await showError("Cannot Save Snippet", error);
      }
    },
  });

  return (
    <Form
      navigationTitle={snippet ? `Edit ${snippet.name}` : "Create Snippet"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Snippet" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="signature" />
      <Form.TextArea {...itemProps.text} title="Text" placeholder='Text inserted by {snippet name="signature"}' />
    </Form>
  );
}

/** Own text blocks, because Raycast's snippets cannot be read through the extension API. */
export function SnippetList() {
  const {
    data: snippets,
    error,
    isLoading,
    revalidate,
  } = usePromise(getSnippets, [], { onError: (error) => showError("Cannot Load Snippets", error) });

  const reload = useCallback(async () => {
    try {
      await revalidate();
    } catch {
      // `onError` has reported it.
    }
  }, [revalidate]);

  async function remove(snippet: TextSnippet) {
    const confirmed = await confirmAlert({
      title: `Delete "${snippet.name}"?`,
      message: "Prompts that use this snippet will fail until you replace it.",
      primaryAction: { title: "Delete Snippet", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await guarded("Cannot Delete Snippet", () => deleteSnippet(snippet.id))();
    await reload();
  }

  const create = (
    <Action.Push
      title="Create Snippet"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SnippetForm onSaved={reload} />}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle="Snippets" searchBarPlaceholder="Search snippets">
      {snippets?.map((snippet) => (
        <List.Item
          key={snippet.id}
          icon={Icon.Text}
          title={snippet.name}
          subtitle={snippetPlaceholder(snippet.name)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Snippet"
                icon={Icon.Pencil}
                target={<SnippetForm snippet={snippet} onSaved={reload} />}
              />
              {create}
              <Action.CopyToClipboard title="Copy Placeholder" content={snippetPlaceholder(snippet.name)} />
              <Action
                title="Delete Snippet"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(snippet)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading &&
        (error ? (
          <List.EmptyView
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="Snippets Could Not Be Loaded"
            description={errorMessage(error)}
            actions={
              <ActionPanel>
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={reload}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            title="No Snippets"
            description="Reusable text for your prompts."
            actions={<ActionPanel>{create}</ActionPanel>}
          />
        ))}
    </List>
  );
}
