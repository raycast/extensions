// EntryEditForm — pushed view for editing an existing entry from the
// Search Entries command.
//
// Reached via the "Edit Entry" action on a search result row, which is
// only offered when the caller has a writable role (owner / admin /
// editor) on the entry's list. The search command already knows the
// list's tag catalog (from /api/v1/lists), so it passes it in rather
// than making this form re-fetch.
//
// Fields follow the same List, Type, Entry, Definition, Description,
// Tags order as Quick Add Entry (minus the list picker — an edit stays
// on the entry's current list; moving between lists isn't supported by
// the update API). The list name renders as a read-only banner for
// context. Tags are a single comma-separated field (matching Quick Add
// Entry), pre-filled with the entry's current tag names; the list's full
// tag set rides in the field's info tooltip for discoverability.
//
// On submit, PATCH /api/v1/entries/:id with a snake_case body. Tags go
// out as tag_names and the server REPLACES the entry's tag set with the
// resolved set (existing names reuse their id, new names are created),
// so the field holds the full desired set and clearing it clears the
// entry's tags. After a successful save we call onSaved (the search
// command revalidates so the detail pane reflects the edit) and pop back
// to the results.

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { apiFetch, errorMessage } from "../lib/api";
import type { Tag } from "../lib/api";
import { ENTRY_TYPES } from "../lib/entryTypes";
import { parseTagNames, tagsFieldInfo } from "../lib/tags";

// The entry fields this form needs, narrowed from the search row.
export interface EditableEntry {
  id: number;
  entry: string;
  definition: string;
  description: string;
  type: string;
  listName: string;
  // Current tag names on the entry (from the search row). Joined into
  // the Tags field's initial comma-separated value.
  tags: string[];
}

interface FormValues {
  entry: string;
  type: string;
  definition: string;
  description: string;
  // Single comma-separated tags field (both existing and new), matching
  // Quick Add Entry. Sent as `tag_names`; the update RPC resolves each
  // name against the list's tags (reusing the id) or creates it, and
  // REPLACES the entry's tag set with the result, so the field holds the
  // full desired set. See add-entry.tsx for why one native pick-or-create
  // control isn't possible in Raycast.
  tags: string;
}

export function EntryEditForm({
  entry,
  listTags,
  onSaved,
}: {
  entry: EditableEntry;
  listTags: Tag[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  // Pre-fill the single Tags field with the entry's current tag names,
  // comma-separated. On submit these round-trip back through tag_names
  // and resolve to the same existing tag ids (case-insensitive), so the
  // tags are preserved unless the user edits the field.
  const initialTags = (Array.isArray(entry.tags) ? entry.tags : []).join(", ");

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (input) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving changes…",
      });
      try {
        const tagNames = parseTagNames(input.tags);

        // Send the full desired tag set as tag_names; the server replaces
        // the entry's tags with the resolved set (an empty field clears
        // them all, since the route omits an empty array and the RPC
        // treats the absent param as "no tags").
        const body: Record<string, unknown> = {
          entry: input.entry ?? "",
          definition: input.definition ?? "",
          description: input.description ?? "",
          type: input.type ?? "term",
          tag_names: tagNames,
        };

        await apiFetch(`/api/v1/entries/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Entry updated";
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update entry";
        toast.message = errorMessage(error);
      }
    },
    initialValues: {
      entry: entry.entry ?? "",
      type: entry.type || "term",
      definition: entry.definition ?? "",
      description: entry.description ?? "",
      tags: initialTags,
    },
    validation: {
      entry: FormValidation.Required,
      definition: FormValidation.Required,
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Entry"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="List" text={entry.listName} />

      <Form.Dropdown title="Type" {...itemProps.type}>
        {ENTRY_TYPES.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.label} />
        ))}
      </Form.Dropdown>

      <Form.TextField title="Entry" {...itemProps.entry} />

      <Form.TextArea title="Definition" {...itemProps.definition} />

      <Form.TextArea title="Description" {...itemProps.description} />

      <Form.TextField
        title="Tags"
        placeholder="Comma-separated. Example: biology, physics, math"
        info={tagsFieldInfo(listTags)}
        {...itemProps.tags}
      />
    </Form>
  );
}
