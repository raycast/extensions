// Quick Add Entry — second Raycast command for List by FullForms.
//
// Flow:
//   1. useListPicker (src/lib/useListPicker.ts) fetches
//      /api/v1/workspaces + /api/v1/lists in parallel and groups
//      lists under their parent workspace. We pass a role filter so
//      only writable lists (owner / admin / editor) appear in the
//      dropdown — viewer roles can't reach POST /entries (the RPC
//      raises not_authorized) so showing those would be a UX dead
//      end. Per-list `tags` (id + name, sorted alphabetically; list-
//      repo migration 20260607000000) ride along on every row and
//      feed the TagPicker below without needing a per-list-change
//      round-trip.
//   2. Auto-select the first writable list (the API orders by
//      updated_at desc, so this is "your most recently edited list" —
//      the common Quick-Add target).
//   3. Form fields, in the order the web's app/components/EntryForm.vue
//      arranges them: List, Entry, Type, Definition, Description, Tags.
//      Web pairs Entry + Type in a flex row; Raycast forms can't render
//      side-by-side, so Type sits immediately under Entry as the
//      closest stacked port. Type-aware placeholders on Entry +
//      Definition mirror the web's TYPE_PLACEHOLDERS map ("Example:
//      GPS" / "Example: Global Positioning System" / etc.). Tags is
//      split across two widgets because Raycast doesn't ship the
//      web's TagInput "type-to-filter-or-create" hybrid: a
//      Form.TagPicker (filterable multiselect) surfaces the list's
//      existing tags so the user can type a prefix and the picker
//      auto-narrows to the matching chip, and a separate "New Tags"
//      Form.TextField below it accepts comma-separated names for
//      brand-new tags. On submit both are forwarded — selected
//      picker IDs as `tag_ids` (migration 20260607000000) and the
//      new-names text as `tag_names` (migration 20260608000000).
//      The picker only renders when the list actually has existing
//      tags; otherwise the single text field below carries everything.
//   4. Duplicate-detection mirrors the web's pair of computeds: as the
//      user types, a debounced GET /api/v1/lists/:id/check-duplicates
//      probe runs and surfaces a soft "already in the list" warning
//      under whichever field matches. Case-insensitive EXACT match
//      (not partial — `open` shouldn't warn about an existing `Open AI`).
//   5. On submit, POST /api/v1/entries with snake_case body. tag_ids
//      forwards only when non-empty so the wire format stays clean.
//   6. On success, the toast carries an Open Entry action linking to
//      list.fullforms.com/{listId}#{entryId} (the same hash-routing
//      url shape the Search command uses). We also stash the
//      just-added entry in `lastAdded` state and render a persistent
//      Form.Description banner above the List dropdown showing the
//      link — the toast disappears after a few seconds but the
//      banner survives until the next successful add, so a user who
//      tabs away mid-add-spree can still get back to the entry they
//      just created. The ActionPanel gets a matching "Open Last Added
//      Entry" action on ⌘O so the link is keyboard-reachable after
//      the toast fades (Form.Description text is plain, not
//      clickable). We clear only the term + definition + description
//      + tags so the user can keep adding to the same list without
//      re-picking list and type.
//
// Empty-state branch: if the user has no writable lists at all (a
// fresh signup who hasn't created one yet, or someone with viewer-only
// membership everywhere), we render a Detail with a CTA to open the
// web app rather than a form with an empty dropdown.

import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { apiBase, apiFetch, authHeaders } from "./lib/api";
import { useListPicker } from "./lib/useListPicker";

interface CreateEntryResponse {
  entry: {
    id: number;
    list_id: number;
    entry: string;
    definition: string;
    description: string;
    type: string;
  };
}

interface DuplicateEntryMatch {
  id: number;
  entry: string;
}

interface DuplicateDefinitionMatch {
  id: number;
  entry: string;
  definition: string;
}

interface DuplicatesResponse {
  entry_match: DuplicateEntryMatch | null;
  definition_match: DuplicateDefinitionMatch | null;
}

interface FormValues {
  listId: string;
  entry: string;
  type: string;
  definition: string;
  description: string;
  // IDs of existing tags selected via the Form.TagPicker, as
  // stringified numbers (Raycast TagPicker.Item values are strings).
  // Parsed back to numbers and forwarded as `tag_ids` on submit
  // (migration 20260607000000 on the list repo).
  tagIds: string[];
  // Comma-separated names of NEW tags to create on this list. The
  // server resolves each name case-insensitively against the list's
  // existing tags and auto-creates any that don't yet exist
  // (migration 20260608000000) — so a stray typo of an existing tag
  // here would dedupe rather than duplicate, but the user should
  // typically pick those from the TagPicker above and only use this
  // field for genuinely new names.
  tagNames: string;
}

const TYPES = [
  { value: "term", label: "Term" },
  { value: "abbreviation", label: "Abbreviation" },
  { value: "word", label: "Word" },
  { value: "name", label: "Name" },
];

const WRITABLE_ROLES = new Set(["owner", "admin", "editor"]);

// Mirrors app/components/EntryForm.vue → TYPE_PLACEHOLDERS. Same four
// keys, same example pairs, so the form gives the user one concrete
// (term, definition) shape per type instead of a generic "e.g. NASA"
// that doesn't fit every type evenly.
const TYPE_PLACEHOLDERS: Record<string, { entry: string; definition: string }> =
  {
    abbreviation: {
      entry: "Example: GPS",
      definition: "Example: Global Positioning System",
    },
    term: {
      entry: "Example: Deep Learning",
      definition: "Example: A machine learning approach using neural networks",
    },
    word: {
      entry: "Example: Innovation",
      definition: "Example: A new method, idea, or product",
    },
    name: {
      entry: "Example: Porsche",
      definition: "Example: German automobile manufacturer",
    },
  };

const DUPLICATE_DEBOUNCE_MS = 350;

export default function AddEntryCommand() {
  // Filter to lists the caller can actually POST entries to —
  // viewer roles get a 403 from the RPC so showing them in the
  // dropdown is a UX dead end. The hook handles fetching,
  // grouping by workspace, and preserving the workspaces-RPC /
  // lists-RPC orderings so buckets[0].lists[0] is the user's
  // most recently edited writable list.
  const {
    buckets: writableByWorkspace,
    total: totalWritable,
    lists: writableLists,
    isLoading,
  } = useListPicker((l) => WRITABLE_ROLES.has(l.effective_role));

  // The most recently created entry in this session. Survives form
  // resets so the user can re-open the entry they just added even
  // after the success toast vanishes. Null until the first successful
  // submit; replaced on each subsequent one (per the "most recent
  // only" UX choice — running history would clutter the form).
  const [lastAdded, setLastAdded] = useState<{
    id: number;
    entry: string;
    listId: number;
  } | null>(null);

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
          title: "Saving entry…",
        });

        try {
          // Parse the TagPicker selection (stringified ids → numbers)
          // and the comma-separated new-names text field. `?? []` /
          // `?? ""` defend against useForm leaving either undefined;
          // trim + filter strips whitespace-only segments from
          // "foo, , bar" → ["foo", "bar"]. Number.isFinite filters
          // out any non-numeric picker value (shouldn't happen, but
          // cheap insurance against a future schema change).
          const tagIds = (input.tagIds ?? [])
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
          const tagNames = (input.tagNames ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          const body: Record<string, unknown> = {
            list_id: listId,
            entry: input.entry ?? "",
            definition: input.definition ?? "",
            description: input.description ?? "",
            type: input.type ?? "term",
          };
          if (tagIds.length > 0) body.tag_ids = tagIds;
          if (tagNames.length > 0) body.tag_names = tagNames;

          const res = await apiFetch<CreateEntryResponse>("/api/v1/entries", {
            method: "POST",
            body: JSON.stringify(body),
          });

          const url = `${apiBase()}/${res.entry.list_id}#${res.entry.id}`;
          toast.style = Toast.Style.Success;
          toast.title = `Added "${res.entry.entry}"`;
          toast.primaryAction = {
            title: "Open Entry",
            onAction: () => open(url),
            shortcut: { modifiers: ["cmd"], key: "o" },
          };
          setLastAdded({
            id: res.entry.id,
            entry: res.entry.entry,
            listId: res.entry.list_id,
          });

          // Keep list + type so the user can keep adding without re-picking;
          // clear the inputs they'd otherwise have to manually wipe.
          setValue("entry", "");
          setValue("definition", "");
          setValue("description", "");
          setValue("tagIds", []);
          setValue("tagNames", "");
          focus("entry");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          toast.style = Toast.Style.Failure;
          toast.title = "Could not save entry";
          toast.message = message;
        }
      },
      // Initialize EVERY field, not just the non-empty ones. Raycast's
      // useForm doesn't guarantee `values.X` is a defined string before
      // the user types — and the useMemo callbacks below read
      // `values.entry.trim()` / `values.definition.trim()` on the very
      // first render. A missing init can leave those undefined and
      // crash with the misleading "TypeError: Cannot read properties of
      // undefined (reading 'trim')" at the top-of-component (useFetch)
      // line per the stack-trace-attribution trap documented under
      // CLAUDE.md → Common Pitfalls. Belt-and-suspenders: every reader
      // also defaults via `?? ""`.
      initialValues: {
        listId: "",
        entry: "",
        type: "term",
        definition: "",
        description: "",
        tagIds: [],
        tagNames: "",
      },
      validation: {
        listId: FormValidation.Required,
        entry: FormValidation.Required,
        definition: FormValidation.Required,
        type: FormValidation.Required,
      },
    });

  // Default the dropdown to the first writable list once data lands.
  // Watching firstListId (a primitive id) keeps the effect cheap and
  // dodges referential-equality re-fires that would happen if we
  // watched the array.
  const firstListId = writableByWorkspace[0]?.lists[0]?.id;
  useEffect(() => {
    if (firstListId !== undefined && !values.listId) {
      setValue("listId", String(firstListId));
    }
  }, [firstListId, setValue, values.listId]);

  // Clear staged tag selections and names when the list changes.
  // tagIds are per-list (a tag from list A doesn't exist on list B,
  // and the API would reject foreign IDs), and tag names that were
  // meaningful on the previous list might be brand-new on the new
  // list and would auto-create unintentionally, polluting the
  // destination's taxonomy. Safer to start the per-list tag fields
  // empty and let the user re-pick against the new list's tag set.
  useEffect(() => {
    setValue("tagIds", []);
    setValue("tagNames", "");
  }, [values.listId, setValue]);

  // Look up the selected list to surface its tag set to the TagPicker
  // and (later) the duplicate-check URL. Inline find rather than
  // useMemo — the writableLists array is small (handful of items)
  // and the hook re-derives it each render anyway, so memoizing
  // here wouldn't have a stable dependency to gate on.
  const selectedList =
    writableLists.find((l) => String(l.id) === values.listId) ?? null;

  // Type-aware placeholders. Falls back to the 'term' shape when
  // values.type is unset (initial render before the dropdown defaults
  // settle) so the Entry/Definition placeholders are always concrete.
  const placeholders = TYPE_PLACEHOLDERS[values.type] ?? TYPE_PLACEHOLDERS.term;

  // Debounce entry + definition so the duplicate-check fetch doesn't
  // fire one round-trip per keystroke. 350ms is the same shape as
  // the web's deep-search debounce on the home page; feels responsive
  // without being chatty. Each field has its own debounce so a fast
  // typist editing both doesn't reset the timer for the other.
  const [debouncedEntry, setDebouncedEntry] = useState("");
  const [debouncedDefinition, setDebouncedDefinition] = useState("");

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedEntry(values.entry ?? ""),
      DUPLICATE_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [values.entry]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedDefinition(values.definition ?? ""),
      DUPLICATE_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [values.definition]);

  // Reset the debounce baselines when the user switches lists so a
  // stale warning from the previous list doesn't linger one tick into
  // the new selection. The useFetch URL also rebuilds when listId
  // changes (which would invalidate keepPreviousData if it were on),
  // but flushing the debounce state too makes the transition feel
  // crisp.
  useEffect(() => {
    setDebouncedEntry("");
    setDebouncedDefinition("");
  }, [values.listId]);

  const checkUrl = useMemo(() => {
    if (!values.listId) return "";
    const entryTrim = debouncedEntry.trim();
    const defTrim = debouncedDefinition.trim();
    if (!entryTrim && !defTrim) return "";
    const qs = new URLSearchParams();
    if (entryTrim) qs.set("entry", entryTrim);
    if (defTrim) qs.set("definition", defTrim);
    return `${apiBase()}/api/v1/lists/${values.listId}/check-duplicates?${qs.toString()}`;
  }, [values.listId, debouncedEntry, debouncedDefinition]);

  const duplicateQuery = useFetch<DuplicatesResponse>(checkUrl, {
    headers: authHeaders(),
    execute: checkUrl !== "",
    keepPreviousData: false,
    // Silent on failure — duplicate-check is informational, a 4xx /
    // 5xx blip shouldn't toast on top of the form the user is
    // actively typing in. The submit path will surface a real
    // failure if it matters.
    onError: () => {},
  });

  // Only surface a warning when the debounced value still matches the
  // current input — otherwise a slow response could ghost the warning
  // for a keystroke or two after the user keeps typing. The match
  // payload itself has the canonical text, so the comparison is on
  // the trimmed-lowercase form (same shape the server matches on).
  const entryDuplicate = useMemo(() => {
    const match = duplicateQuery.data?.entry_match ?? null;
    if (!match) return null;
    const live = (values.entry ?? "").trim().toLowerCase();
    if (!live) return null;
    const matchEntry = (match.entry ?? "").trim().toLowerCase();
    return live === matchEntry ? match : null;
  }, [duplicateQuery.data, values.entry]);

  const definitionDuplicate = useMemo(() => {
    const match = duplicateQuery.data?.definition_match ?? null;
    if (!match) return null;
    const live = (values.definition ?? "").trim().toLowerCase();
    if (!live) return null;
    const matchDef = (match.definition ?? "").trim().toLowerCase();
    return live === matchDef ? match : null;
  }, [duplicateQuery.data, values.definition]);

  if (!isLoading && totalWritable === 0) {
    return (
      <Detail
        markdown={
          "# No editable lists\n\n" +
          "You're signed in, but the API token's account doesn't have edit access to any list.\n\n" +
          "Open the web app to create a list, or ask a workspace owner for an Editor role on an existing one."
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
            title="Add Entry"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          {lastAdded && (
            <Action.OpenInBrowser
              title="Open Last Added Entry"
              url={`${apiBase()}/${lastAdded.listId}#${lastAdded.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          {entryDuplicate && (
            <Action.OpenInBrowser
              title="View Existing Entry"
              url={`${apiBase()}/${values.listId}#${entryDuplicate.id}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          )}
          <Action
            title="Open Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {lastAdded && (
        <Form.Description
          title="Last Added"
          text={`✓ ${lastAdded.entry} — ${apiBase().replace(/^https?:\/\//, "")}/${lastAdded.listId}#${lastAdded.id}  (⌘O to open)`}
        />
      )}
      <Form.Dropdown title="List" {...itemProps.listId}>
        {writableByWorkspace.map((bucket) => (
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
        placeholder={placeholders.entry}
        {...itemProps.entry}
      />
      {entryDuplicate && (
        <Form.Description
          text={`⚠ "${entryDuplicate.entry}" is already in the list. ⌘⇧O to view it.`}
        />
      )}

      <Form.Dropdown title="Type" {...itemProps.type}>
        {TYPES.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.label} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        title="Definition"
        placeholder={placeholders.definition}
        {...itemProps.definition}
      />
      {definitionDuplicate && (
        <Form.Description
          text={`⚠ This definition is already used by "${definitionDuplicate.entry}".`}
        />
      )}

      <Form.TextArea
        title="Description"
        placeholder="Optional longer notes, examples, references…"
        {...itemProps.description}
      />

      {/* Tags split across two widgets — see header comment for the
          rationale. The TagPicker is filterable: typing a prefix
          narrows the chip list, which is the Raycast-native port of
          the web's TagInput "type-to-find-existing-tag" affordance.
          Defensive Array.isArray guard per CLAUDE.md → Common
          Pitfalls: `tags` is a brand-new field on /api/v1/lists rows
          (migration 20260607000000); Raycast's useFetch can briefly
          render a cached prior-shape response on the first launch
          after the API redeploy, in which case `selectedList.tags`
          is undefined and a bare `.length` / `.map()` crashes the
          whole command. */}
      {selectedList &&
        Array.isArray(selectedList.tags) &&
        selectedList.tags.length > 0 && (
          <Form.TagPicker
            title="Tags"
            info="Pick from tags already on this list. Type to filter."
            {...itemProps.tagIds}
          >
            {selectedList.tags.map((t) => (
              <Form.TagPicker.Item
                key={t.id}
                value={String(t.id)}
                title={t.name}
              />
            ))}
          </Form.TagPicker>
        )}
      <Form.TextField
        title={
          selectedList &&
          Array.isArray(selectedList.tags) &&
          selectedList.tags.length > 0
            ? "New Tags"
            : "Tags"
        }
        placeholder="comma-separated, e.g. biology, physics, math"
        info="Type names of new tags to create on this list. Existing tags are case-insensitively deduped, so a typo of an already-existing tag will resolve to that tag instead of creating a duplicate."
        {...itemProps.tagNames}
      />
    </Form>
  );
}
