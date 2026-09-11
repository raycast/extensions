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
//   3. Form fields, in order: List, Type, Entry, Definition,
//      Description, Tags. The web's app/components/EntryForm.vue pairs
//      Entry + Type in a flex row; Raycast forms can't render side-by-
//      side, so we stack them, with Type ABOVE Entry. Ordering Type
//      first is deliberate: the type-aware placeholders on Entry +
//      Definition (mirroring the web's TYPE_PLACEHOLDERS map: "Example:
//      GPS" / "Example: Global Positioning System" / etc.) then reflect
//      the chosen type before the user starts typing into either. Tags
//      is a SINGLE comma-separated field covering both existing and new
//      tags. Raycast doesn't ship the web's TagInput "type-to-filter-
//      or-create" hybrid: Form.TagPicker only selects from predefined
//      items and has no onSearchTextChange hook to capture typed text,
//      so a native single "pick-or-create" control isn't possible. The
//      text field is the closest single-field port: every name is sent
//      as `tag_names` (migration 20260608000000), and the server
//      resolves each one case-insensitively against the list's existing
//      tags (reusing that id) or creates it. The list's existing tag
//      names ride in the field's info tooltip for discoverability. (This
//      replaced an earlier TagPicker + "New Tags" two-widget split.)
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
// AI helpers: two action-panel actions (Raycast AI.ask) generate a
// definition from the term and a description from the term + definition,
// dropping the result into the field. Gated on environment.canAccess(AI)
// (Raycast Pro) so they only render when usable. Dictation is NOT wired:
// Raycast's dictation is ambient input that already works in any text
// field, with no extension API to integrate.
//
// Empty-state branch: if the user has no writable lists at all (a
// fresh signup who hasn't created one yet, or someone with viewer-only
// membership everywhere), we render a Detail with a CTA to open the
// web app rather than a form with an empty dropdown.
//
// Reused as a pushed view: the Search Entries command's "No matches"
// state pushes this form (via Action.Push) pre-filled with the search
// term through the optional `initialEntry` prop, so a user who searched
// for something that doesn't exist yet can add it without leaving the
// search window. Launched as a normal Raycast command, the prop is
// simply absent (Raycast passes LaunchProps, which has no such key) and
// the field starts empty.

import {
  AI,
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchType,
  Toast,
  environment,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  apiBase,
  apiFetch,
  authHeaders,
  errorMessage,
  WRITABLE_ROLES,
} from "./lib/api";
import {
  CALLOUTS,
  appendCalloutPrefix,
  descriptionFieldInfo,
} from "./lib/descriptionMarkup";
import { ENTRY_TYPES, entryTypeLabel } from "./lib/entryTypes";
import { iconForList } from "./lib/listIconCatalog";
import { crossShortcut, shortcutHint } from "./lib/platform";
import { parseTagNames, tagsFieldInfo } from "./lib/tags";
import { useDebouncedValue } from "./lib/useDebouncedValue";
import {
  useAutoSelectFirstList,
  requireListId,
  useListPicker,
} from "./lib/useListPicker";

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
  // Single comma-separated tags field covering BOTH existing and new
  // tags. Every name is forwarded as `tag_names` on submit; the server
  // resolves each one case-insensitively against the list's existing
  // tags (reusing that tag's id) and auto-creates any that don't yet
  // exist (migration 20260608000000). This replaces the earlier
  // Form.TagPicker (existing) + Form.TextField (new) split: Raycast's
  // Form.TagPicker can only select from predefined items and has no
  // onSearchTextChange hook to capture typed text, so a single native
  // "pick-or-create" control isn't possible; a text field with
  // server-side name resolution is the closest single-field port of the
  // web's TagInput. Existing tag names are surfaced in the field's info
  // tooltip for discoverability.
  tags: string;
}

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

// Keep a duplicate warning only while the debounced server match still
// equals the live input: a slow response could otherwise ghost a warning
// for a keystroke or two after the user kept typing. `textOf` pulls the
// comparable field off the match (the term for an entry match, the
// definition text for a definition match); comparison is trimmed +
// lowercased, the same shape the server matches on. Shared by both the
// entry and definition duplicate checks.
function liveMatch<M>(
  match: M | null,
  textOf: (match: M) => string,
  liveInput: string | undefined,
): M | null {
  if (!match) return null;
  const live = (liveInput ?? "").trim().toLowerCase();
  if (!live) return null;
  return live === textOf(match).trim().toLowerCase() ? match : null;
}

export default function AddEntryCommand({
  initialEntry = "",
}: {
  initialEntry?: string;
} = {}) {
  // Filter to lists the caller can actually POST entries to —
  // viewer roles get a 403 from the RPC so showing them in the
  // dropdown is a UX dead end. The hook handles fetching,
  // grouping by workspace, and preserving the workspaces-RPC /
  // lists-RPC orderings so buckets[0].lists[0] is the user's
  // most recently edited writable list.
  const {
    buckets: writableByWorkspace,
    total: totalWritable,
    accessibleTotal,
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
        const listId = await requireListId(input.listId);
        if (listId === null) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Saving entry…",
        });

        try {
          // Everything goes through `tag_names`; the server matches
          // existing tags case-insensitively (reusing their ids) and
          // creates the rest, so both existing and new tags flow
          // through one field. Parse rules live in lib/tags.ts.
          const tagNames = parseTagNames(input.tags);
          const body: Record<string, unknown> = {
            list_id: listId,
            entry: input.entry ?? "",
            definition: input.definition ?? "",
            description: input.description ?? "",
            type: input.type ?? "term",
          };
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
            shortcut: crossShortcut(["cmd"], "o"),
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
          setValue("tags", "");
          focus("entry");
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not save entry";
          toast.message = errorMessage(error);
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
        entry: initialEntry,
        type: "term",
        definition: "",
        description: "",
        tags: "",
      },
      validation: {
        listId: FormValidation.Required,
        entry: FormValidation.Required,
        definition: FormValidation.Required,
        type: FormValidation.Required,
      },
    });

  // Default the dropdown to the first writable list once data lands
  // (shared hook; see useListPicker.ts for the ordering rationale).
  const firstListId = writableByWorkspace[0]?.lists[0]?.id;
  useAutoSelectFirstList(firstListId, values.listId, setValue);

  // Clear the tags field when the list changes. Tag names meaningful on
  // the previous list might be brand-new on the new one and would
  // auto-create unintentionally, polluting the destination's taxonomy.
  // Safer to start empty and let the user re-enter against the new
  // list's tag set (surfaced in the field's info tooltip).
  useEffect(() => {
    setValue("tags", "");
  }, [values.listId, setValue]);

  // Look up the selected list to surface its tag set in the Tags field's
  // info tooltip and (later) the duplicate-check URL. Inline find rather
  // than useMemo — the writableLists array is small (handful of items)
  // and the hook re-derives it each render anyway, so memoizing here
  // wouldn't have a stable dependency to gate on.
  const selectedList =
    writableLists.find((l) => String(l.id) === values.listId) ?? null;

  // Type-aware placeholders. Falls back to the 'term' shape when
  // values.type is unset (initial render before the dropdown defaults
  // settle) so the Entry/Definition placeholders are always concrete.
  const placeholders = TYPE_PLACEHOLDERS[values.type] ?? TYPE_PLACEHOLDERS.term;

  // Debounce entry + definition so the duplicate-check fetch doesn't fire
  // one round-trip per keystroke. 350ms mirrors the web's home-page deep-
  // search debounce; each field debounces independently so a fast typist
  // editing both doesn't reset the other's timer. When the list changes
  // the check URL rebuilds with the new listId and, with keepPreviousData
  // off, the in-flight refetch drops any stale warning until fresh data
  // for the new list lands.
  const debouncedEntry = useDebouncedValue(
    values.entry ?? "",
    DUPLICATE_DEBOUNCE_MS,
  );
  const debouncedDefinition = useDebouncedValue(
    values.definition ?? "",
    DUPLICATE_DEBOUNCE_MS,
  );

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

  // Surface a warning only when the debounced match still equals the live
  // input (see liveMatch for why). Entry matches compare the term,
  // definition matches compare the definition text.
  const entryDuplicate = useMemo(
    () =>
      liveMatch(
        duplicateQuery.data?.entry_match ?? null,
        (m) => m.entry ?? "",
        values.entry,
      ),
    [duplicateQuery.data, values.entry],
  );

  const definitionDuplicate = useMemo(
    () =>
      liveMatch(
        duplicateQuery.data?.definition_match ?? null,
        (m) => m.definition ?? "",
        values.definition,
      ),
    [duplicateQuery.data, values.definition],
  );

  // Raycast AI (AI.ask) requires a Pro subscription. Gate the generate
  // actions on environment.canAccess so users without access don't see
  // actions that would only ever error. Computed once per render (cheap,
  // synchronous). Dictation isn't wired here on purpose: Raycast's
  // dictation is an ambient input feature that already works in any
  // Form.TextField / TextArea, with no extension API to integrate.
  const canUseAI = environment.canAccess(AI);

  const typeLabel = entryTypeLabel(values.type || "term");

  // Fill a field from Raycast AI. Shared by the Generate Definition /
  // Generate Description actions: both require a non-empty term, show an
  // animated toast, ask the AI at low creativity (glossary content is
  // factual, not open-ended), drop the trimmed answer into the field, and
  // toast the outcome. Only the target field, the noun in the copy, and
  // the prompt differ; buildPrompt receives the validated term and can
  // read other field values (the description prompt folds in the
  // definition) off the closure.
  const generateField = async (options: {
    field: "definition" | "description";
    noun: string;
    buildPrompt: (term: string) => string;
  }) => {
    const term = (values.entry ?? "").trim();
    if (!term) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a term first",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Generating ${options.noun}…`,
    });
    try {
      const answer = await AI.ask(options.buildPrompt(term), {
        creativity: "low",
      });
      setValue(options.field, answer.trim());
      toast.style = Toast.Style.Success;
      toast.title = `${options.noun[0].toUpperCase()}${options.noun.slice(1)} generated`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not generate ${options.noun}`;
      toast.message = errorMessage(error);
    }
  };

  const generateDefinition = () =>
    generateField({
      field: "definition",
      noun: "definition",
      buildPrompt: (term) =>
        `Write a concise, dictionary-style definition for the ${typeLabel.toLowerCase()} "${term}". ` +
        `One sentence, under 30 words, factual and neutral. ` +
        `Return ONLY the definition text: no surrounding quotes, no label, no preamble.`,
    });

  const generateDescription = () =>
    generateField({
      field: "description",
      noun: "description",
      buildPrompt: (term) => {
        const def = (values.definition ?? "").trim();
        return (
          `Write a short explanatory description (2 to 4 sentences) for the glossary ${typeLabel.toLowerCase()} "${term}"` +
          (def ? `, which is defined as: ${def}` : "") +
          `. Factual and neutral, suitable for a glossary entry. ` +
          `Return ONLY the description text: no heading, no preamble.`
        );
      },
    });

  if (!isLoading && totalWritable === 0) {
    // Two ways to land here, and they want different copy + actions:
    //
    //   • accessibleTotal === 0 → a brand-new account that simply hasn't
    //     made a list yet. This isn't a permissions failure, so frame it
    //     as onboarding ("create your first list") rather than "no edit
    //     access to any list", which reads like something is wrong.
    //
    //   • accessibleTotal  >  0 → a member of one or more lists but with
    //     only viewer access everywhere. Creating a list is still the
    //     way to get write access, but this user ALSO has the Suggest
    //     Entry path open to them (any role can queue a suggestion), so
    //     surface it as a real alternative instead of a dead end.
    const isBrandNew = accessibleTotal === 0;

    // Deep-link straight to the web app's list-creation page rather than
    // the app root; a first-time user's very next step is making a list.
    const createUrl = `${apiBase()}/create`;

    const markdown = isBrandNew
      ? "# Create your first list\n\n" +
        "You're signed in, but you haven't created any lists yet. " +
        "Make one and you can start adding entries right here.\n\n" +
        "Press Enter to create a list in the web app."
      : "# No editable lists\n\n" +
        "You can view lists, but the API token's account doesn't have edit access to any of them.\n\n" +
        "Create your own list, suggest an entry to a list owner, or ask a workspace owner for an Editor role on an existing list.";

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Create a List"
              icon={Icon.Plus}
              url={createUrl}
            />
            {!isBrandNew && (
              <Action
                title="Suggest an Entry Instead"
                icon={Icon.Envelope}
                onAction={async () => {
                  try {
                    await launchCommand({
                      name: "suggest-entry",
                      type: LaunchType.UserInitiated,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not open Suggest Entry",
                      message: "Launch it from the Raycast root search.",
                    });
                  }
                }}
              />
            )}
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
          {/* Raycast AI helpers (Pro-gated). Generate a definition from
              the term, or a description from the term + definition, and
              drop the result into the field. Placed in their own section
              so they don't crowd the primary Add Entry action. */}
          {canUseAI && (
            <ActionPanel.Section title="AI">
              <Action
                title="Generate Definition"
                icon={Icon.Stars}
                shortcut={crossShortcut(["cmd"], "g")}
                onAction={generateDefinition}
              />
              <Action
                title="Generate Description"
                icon={Icon.Stars}
                shortcut={crossShortcut(["cmd", "shift"], "g")}
                onAction={generateDescription}
              />
            </ActionPanel.Section>
          )}
          {/* Callout inserts, the action-panel port of the web's `/`
              picker (Raycast forms can't host an inline popup; see
              lib/descriptionMarkup.ts). Each appends its prefix to the
              Description as a fresh block and focuses the field, so
              the caret lands at the end, right after the prefix. */}
          <ActionPanel.Section title="Insert into Description">
            {CALLOUTS.map((c) => (
              <Action
                key={c.name}
                title={`Insert ${c.name} Callout`}
                icon={Icon.QuoteBlock}
                shortcut={crossShortcut(["cmd", "shift"], c.shortcutKey)}
                onAction={() => {
                  setValue(
                    "description",
                    appendCalloutPrefix(values.description ?? "", c.prefix),
                  );
                  focus("description");
                }}
              />
            ))}
          </ActionPanel.Section>
          {lastAdded && (
            <Action.OpenInBrowser
              title="Open Last Added Entry"
              url={`${apiBase()}/${lastAdded.listId}#${lastAdded.id}`}
              shortcut={crossShortcut(["cmd"], "o")}
            />
          )}
          {entryDuplicate && (
            <Action.OpenInBrowser
              title="View Existing Entry"
              url={`${apiBase()}/${values.listId}#${entryDuplicate.id}`}
              shortcut={crossShortcut(["cmd", "shift"], "o")}
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
          text={`✓ ${lastAdded.entry} · ${apiBase().replace(/^https?:\/\//, "")}/${lastAdded.listId}#${lastAdded.id}  (${shortcutHint(["cmd"], "o")} to open)`}
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
                icon={iconForList({
                  icon: l.icon,
                  color: l.color,
                  name: l.name,
                  id: l.id,
                })}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Type" {...itemProps.type}>
        {ENTRY_TYPES.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.label} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Entry"
        placeholder={placeholders.entry}
        {...itemProps.entry}
      />
      {entryDuplicate && (
        <Form.Description
          text={`⚠ "${entryDuplicate.entry}" is already in the list. ${shortcutHint(["cmd", "shift"], "o")} to view it.`}
        />
      )}

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
        info={descriptionFieldInfo()}
        {...itemProps.description}
      />

      {/* Single Tags field: one comma-separated input covering both
          existing and new tags. Replaces the former TagPicker (existing)
          + New Tags (new) split — see the FormValues.tags comment for
          why one native "pick-or-create" control isn't possible in
          Raycast. Parse rules + the ⓘ tooltip copy (which lists the
          selected list's existing tags for discoverability) live in
          lib/tags.ts, shared with the entry editor. */}
      <Form.TextField
        title="Tags"
        placeholder="Comma-separated. Example: biology, physics, math"
        info={tagsFieldInfo(selectedList?.tags)}
        {...itemProps.tags}
      />
    </Form>
  );
}
