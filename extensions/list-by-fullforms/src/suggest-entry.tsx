// Suggest Entry — third Raycast command for List by FullForms.
//
// Sister command to Quick Add Entry, sized for the viewer case: the
// caller can see the list (workspace member at any role, OR the list
// is public) but doesn't have direct write access OR is choosing to
// queue the entry for the owner's moderation rather than dropping it
// straight in. POSTs /api/v1/suggestions; the server-side
// api_create_suggestion_for_token RPC gates on
// suggestions_mode != 'off' + caller visibility.
//
// The dropdown surfaces every list the caller belongs to. Two cases
// the user can hit at submit time that the dropdown can't pre-filter
// without a schema migration to expose suggestions_mode on
// /api/v1/lists (deferred):
//
//   • Caller picks a list whose owner has suggestions_mode='off'.
//     RPC raises 'suggestions_not_enabled' → 403 → friendly toast
//     ("Suggestions aren't enabled on this list…"). Caller can switch
//     lists without losing their typed term / definition.
//
//   • Caller picks a list they're a member of (always passes
//     list_not_accessible). The case "caller wants to suggest on a
//     public list they're NOT a member of" isn't reachable today
//     because /api/v1/lists filters to members; that's an accepted
//     v1 scope.
//
// Suggestion shape on the wire: { list_id, entry_text,
// definition_text? }. We don't surface search_query (no Raycast-side
// search context to attribute it to) or tag_ids (would need a per-
// list tag fetch + Form.TagPicker, deferred until there's a real
// need).

import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { ApiError, apiBase, apiFetch } from "./lib/api";
import { useListPicker } from "./lib/useListPicker";

interface FormValues {
  listId: string;
  entry: string;
  definition: string;
}

export default function SuggestEntryCommand() {
  // No role filter — suggestions are available at any role on any
  // list the caller can see (the RPC enforces visibility, not write
  // permission). Quick Add Entry filters to writable roles; this
  // command intentionally doesn't.
  const {
    buckets: listsByWorkspace,
    total: totalLists,
    isLoading,
  } = useListPicker();

  const { handleSubmit, itemProps, setValue, focus, values } =
    useForm<FormValues>({
      onSubmit: async (input) => {
        const listId = Number(input.listId);
        if (!Number.isFinite(listId)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Pick a list first",
          });
          return;
        }

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Submitting suggestion…",
        });

        try {
          await apiFetch<{ ok: true }>("/api/v1/suggestions", {
            method: "POST",
            body: JSON.stringify({
              list_id: listId,
              entry_text: input.entry,
              definition_text: input.definition || null,
            }),
          });

          toast.style = Toast.Style.Success;
          toast.title = `Submitted "${input.entry}"`;
          toast.message = "The list owner will see it in their queue.";

          // Keep list, clear term + definition so the user can keep
          // queuing suggestions to the same list.
          setValue("entry", "");
          setValue("definition", "");
          focus("entry");
        } catch (error) {
          const friendly = friendlySuggestionError(error);
          toast.style = Toast.Style.Failure;
          toast.title = friendly.title;
          toast.message = friendly.message;
        }
      },
      validation: {
        listId: FormValidation.Required,
        entry: FormValidation.Required,
      },
    });

  const firstListId = listsByWorkspace[0]?.lists[0]?.id;
  useEffect(() => {
    if (firstListId !== undefined && !values.listId) {
      setValue("listId", String(firstListId));
    }
  }, [firstListId, setValue, values.listId]);

  if (!isLoading && totalLists === 0) {
    return (
      <Detail
        markdown={
          "# No accessible lists\n\n" +
          "You're signed in, but the API token's account isn't a member of any list. " +
          "Open the web app to create a list or accept an invitation."
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open List" url={apiBase()} />
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Suggestion"
            icon={Icon.Envelope}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="List" {...itemProps.listId}>
        {listsByWorkspace.map((bucket) => (
          <Form.Dropdown.Section
            key={bucket.workspace.id}
            title={bucket.workspace.name}
          >
            {bucket.lists.map((l) => (
              <Form.Dropdown.Item
                key={l.id}
                value={String(l.id)}
                title={l.name}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Entry"
        placeholder="e.g. NASA"
        {...itemProps.entry}
      />

      <Form.TextArea
        title="Definition"
        placeholder="Optional. Leave blank if you'd like the owner to fill it in."
        {...itemProps.definition}
      />

      <Form.Description text="The list owner reviews suggestions before they appear. You'll see your name attached so they can follow up." />
    </Form>
  );
}

// Translate the RPC's structured error codes into user-facing copy.
// The codes themselves come through as `error.message` verbatim from
// the server-side mapRpcError → statusMessage chain (see
// server/utils/apiAuth.js). Unknown codes fall through to the raw
// message — useful in dev and harmless in prod since the RPC
// raise-list is bounded.
function friendlySuggestionError(error: unknown): {
  title: string;
  message: string;
} {
  if (error instanceof ApiError) {
    switch (error.message) {
      case "suggestions_not_enabled":
        return {
          title: "Suggestions are off for this list",
          message:
            "The owner hasn't turned on suggestions. Pick another list or ask the owner to enable them.",
        };
      case "list_not_accessible":
      case "not_authorized":
        return {
          title: "Can't suggest on this list",
          message: "You don't have access to it.",
        };
      case "list_not_found":
        return {
          title: "List not found",
          message: "Pick another list and try again.",
        };
      case "entry_text_required":
        return {
          title: "Entry term is required",
          message: "Add a term and try again.",
        };
    }
    return {
      title: "Could not submit suggestion",
      message: error.message,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { title: "Could not submit suggestion", message };
}
