import { categoryTitle } from "./model.ts";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  AIError,
  aiConfigFromPreferences,
  aiEndpoint,
  suggestMetadata,
} from "./ai.ts";
import type { SelectedFields, Suggestion } from "./ai.ts";
import { normalizeBookmarkUrl } from "./bookmark-utils.ts";
import {
  bookmarkMutation,
  DEFAULT_LOCATION,
  LibraryError,
  TRASH_LOCATION,
} from "./model.ts";
import type { Bookmark, Catalog, LibraryState, Location } from "./model.ts";
import { fetchAndPersistIcon } from "./icon-service.ts";
import { commit } from "./repository.ts";

/** Stable failure text for the three commands; never includes API keys or raw responses. */
export function failureMessage(error: unknown): string {
  if (error instanceof LibraryError) return `${error.code}: ${error.message}`;
  if (error instanceof AIError) return error.message;
  return error instanceof Error && error.message
    ? error.message
    : "Unknown error";
}

const LOCATION_PREFIX = "loc:";

export function locationValue(location: Location): string {
  return `${LOCATION_PREFIX}${encodeURIComponent(location.groupId)}:${encodeURIComponent(location.subGroupId)}`;
}

export function parseLocationValue(value: string): Location {
  const [, groupId, subGroupId] = value.split(":");
  return {
    groupId: decodeURIComponent(groupId),
    subGroupId: decodeURIComponent(subGroupId),
  };
}

export function locationOptions(
  catalog: Catalog,
): { value: string; title: string }[] {
  return catalog.groups
    .filter((group) => !group.isDeleted && group.id !== TRASH_LOCATION.groupId)
    .flatMap((group) =>
      group.children
        .filter((sub) => !sub.isDeleted && sub.id !== TRASH_LOCATION.subGroupId)
        .map((sub) => ({
          value: locationValue({ groupId: group.id, subGroupId: sub.id }),
          title: `${categoryTitle(group.id, group.name)} › ${categoryTitle(sub.id, sub.name)}`,
        })),
    );
}

export interface BookmarkFormProps {
  root: string;
  state: LibraryState;
  bookmark?: Bookmark;
  /** Prefill for create (ignored when editing). */
  seed?: { url?: string; title?: string; desc?: string; tags?: string[] };
  onSaved: (state: LibraryState, bookmark: Bookmark) => void;
}

/** Shared create/edit form. Heads are captured when the form is opened; stale writes are rejected. */
export function BookmarkForm({
  root,
  state,
  bookmark,
  seed,
  onSaved,
}: BookmarkFormProps) {
  const { push, pop } = useNavigation();
  const [url, setUrl] = useState(bookmark?.url ?? seed?.url ?? "");
  const [title, setTitle] = useState(bookmark?.title ?? seed?.title ?? "");
  const [desc, setDesc] = useState(bookmark?.desc ?? seed?.desc ?? "");
  const [tagsText, setTagsText] = useState(
    (bookmark?.tags ?? seed?.tags ?? []).join(", "),
  );
  const tags = tagsText
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const [pinned, setPinned] = useState(bookmark?.pinned === true);
  const [allowUniversal, setAllowUniversal] = useState(
    bookmark?.allowUniversal === true,
  );
  const [locations, setLocations] = useState<string[]>(
    (bookmark?.locations ?? [DEFAULT_LOCATION]).map(locationValue),
  );
  const [aiFields, setAiFields] = useState<string[]>([
    "title",
    "url",
    "desc",
    "tags",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleted = bookmark?.isDeleted === true;
  const options = locationOptions(state.catalog);

  async function save() {
    let normalized: string;
    try {
      normalized = normalizeBookmarkUrl(url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: failureMessage(error),
      });
      return;
    }
    const nextTitle = title.trim();
    if (!nextTitle) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a title" });
      return;
    }
    const nextLocations = deleted
      ? (bookmark?.locations ?? [DEFAULT_LOCATION])
      : locations.map(parseLocationValue);
    if (!nextLocations.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one category location",
        message: "To remove all categories, move the bookmark to Trash",
      });
      return;
    }
    const now = Date.now();
    let value: Bookmark = bookmark
      ? {
          ...bookmark,
          title: nextTitle,
          url: normalized,
          desc: desc.trim() || undefined,
          tags: [...new Set(tags)],
          pinned,
          allowUniversal,
          locations: nextLocations,
          updatedAt: now,
        }
      : {
          id: randomUUID(),
          title: nextTitle,
          url: normalized,
          desc: desc.trim() || undefined,
          tags: [...new Set(tags)],
          pinned,
          allowUniversal,
          locations: nextLocations,
          createdAt: now,
          updatedAt: now,
        };
    setIsSubmitting(true);
    try {
      const urlChanged = !bookmark || bookmark.url !== normalized;
      if (
        !bookmark ||
        urlChanged ||
        !bookmark.icon ||
        bookmark.icon.type === "text"
      ) {
        try {
          const icon = await fetchAndPersistIcon(root, normalized, nextTitle);
          value = { ...value, icon, iconMatchedAt: Date.now() };
        } catch {
          /* keep previous icon / none */
        }
      }
      const result = await commit(root, {
        mutations: [bookmarkMutation(state, value)],
        expectedHeads: state.heads,
      });
      onSaved(result.state, value);
      await showToast({
        style: Toast.Style.Success,
        title: bookmark ? "Bookmark updated" : "Bookmark added",
        message: result.warning ?? value.title,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestSuggestion() {
    const selected: SelectedFields = {};
    if (aiFields.includes("title") && title.trim())
      selected.title = title.trim();
    if (aiFields.includes("url") && url.trim()) selected.url = url.trim();
    if (aiFields.includes("desc") && desc.trim()) selected.desc = desc.trim();
    if (aiFields.includes("tags") && tags.length) selected.tags = tags;
    if (!Object.keys(selected).length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The selected fields have no content to send",
      });
      return;
    }
    const config = aiConfigFromPreferences(getPreferenceValues<Preferences>());
    let endpoint: string;
    try {
      endpoint = aiEndpoint(config);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid AI configuration",
        message: failureMessage(error),
      });
      return;
    }
    const confirmed = await confirmAlert({
      icon: Icon.Stars,
      title: "Send selected fields to the AI service?",
      message: [
        `Protocol: ${config.protocol}`,
        `Service: ${endpoint}`,
        `Model: ${config.model || "Not configured"}`,
        `Fields sent: ${Object.keys(selected)
          .map(
            (key) =>
              ({
                title: "Title",
                url: "URL",
                desc: "Description",
                tags: "Tags",
              })[key as "title" | "url" | "desc" | "tags"],
          )
          .join(", ")}`,
        "",
        "Category locations, visit counts, and directory paths are not sent. The API key is sent only as an authentication header to the service above; it is never included in prompts, the library, or exports. Suggestions require your approval before filling the form.",
      ].join("\n"),
      primaryAction: { title: "Send" },
    });
    if (!confirmed) return;
    const controller = new AbortController();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Requesting AI suggestions",
      message: endpoint,
      primaryAction: {
        title: "Cancel",
        onAction: () => controller.abort(),
      },
    });
    try {
      const suggestion = await suggestMetadata(
        config,
        selected,
        controller.signal,
      );
      await toast.hide();
      push(
        <SuggestionDetail
          suggestion={suggestion}
          endpoint={endpoint}
          current={{ title, desc, tags }}
          onApply={() => {
            if (suggestion.title) setTitle(suggestion.title);
            if (suggestion.desc !== undefined) setDesc(suggestion.desc);
            if (suggestion.tags) setTagsText(suggestion.tags.join(", "));
          }}
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "No suggestions received";
      toast.message = failureMessage(error);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={bookmark ? "Edit Bookmark" : "Add Bookmark"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={bookmark ? "Save Changes" : "Add Bookmark"}
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action
            title="AI Suggestions (BYOK)"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={requestSuggestion}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        value={url}
        onChange={setUrl}
        placeholder="https://example.com/{query}"
        info={
          "Only http(s) URLs are accepted; {name} is a template parameter filled in when opening"
        }
      />
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="desc"
        title="Description"
        value={desc}
        onChange={setDesc}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        value={tagsText}
        onChange={setTagsText}
        placeholder="Separate tags with commas"
      />
      {deleted ? (
        <Form.Description
          title="Category Locations"
          text="This bookmark is in Trash; restore it before editing category locations."
        />
      ) : (
        <Form.TagPicker
          id="locations"
          title="Category Locations (multiple)"
          value={locations}
          onChange={setLocations}
        >
          {options.map((option) => (
            <Form.TagPicker.Item
              key={option.value}
              value={option.value}
              title={option.title}
            />
          ))}
        </Form.TagPicker>
      )}
      <Form.Checkbox
        id="pinned"
        title="Favorite"
        label="Add to Favorites (pin)"
        value={pinned}
        onChange={setPinned}
      />
      <Form.Checkbox
        id="allowUniversal"
        title="Universal Match"
        label="Use as a fallback when local search has no results"
        value={allowUniversal}
        onChange={setAllowUniversal}
      />
      <Form.Description
        title="AI Privacy"
        text="Only selected fields are sent to the chosen service when you request it; suggestions are not saved automatically."
      />
      <Form.TagPicker
        id="aiFields"
        title="Fields to Send to AI"
        value={aiFields}
        onChange={setAiFields}
      >
        <Form.TagPicker.Item value="title" title="Title" />
        <Form.TagPicker.Item value="url" title="URL" />
        <Form.TagPicker.Item value="desc" title="Description" />
        <Form.TagPicker.Item value="tags" title="Tags" />
      </Form.TagPicker>
    </Form>
  );
}

function SuggestionDetail({
  suggestion,
  endpoint,
  current,
  onApply,
}: {
  suggestion: Suggestion;
  endpoint: string;
  current: { title: string; desc: string; tags: string[] };
  onApply: () => void;
}) {
  const { pop } = useNavigation();

  const hasSuggestion = Boolean(
    suggestion.title ||
    suggestion.desc !== undefined ||
    suggestion.tags?.length,
  );
  return (
    <Form
      navigationTitle="AI Suggestions (not applied)"
      actions={
        <ActionPanel>
          {hasSuggestion && (
            <Action
              title="Fill Form"
              icon={Icon.Pencil}
              onAction={() => {
                onApply();
                pop();
              }}
            />
          )}
          <Action title="Back to Form" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="Service" text={endpoint} />
      <Form.Description
        title="Current Title"
        text={current.title || "(empty)"}
      />
      <Form.Description
        title="Suggested Title"
        text={suggestion.title ?? "(unchanged)"}
      />
      <Form.Description
        title="Current Description"
        text={current.desc || "(empty)"}
      />
      <Form.Description
        title="Suggested Description"
        text={suggestion.desc ?? "(unchanged)"}
      />
      <Form.Description
        title="Current Tags"
        text={current.tags.join(", ") || "(empty)"}
      />
      <Form.Description
        title="Suggested Tags"
        text={suggestion.tags?.join(", ") ?? "(unchanged)"}
      />
      <Form.Description
        title="Note"
        text="Shown as plain text. Filling the form does not save; you still need to submit it."
      />
    </Form>
  );
}
