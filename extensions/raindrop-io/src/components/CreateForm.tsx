import { Action, ActionPanel, Form, getPreferenceValues, Icon, AI, environment, Toast, showToast } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import fetch, { Response } from "node-fetch";
import { useEffect, useState, useCallback } from "react";
import { FormValues, Collection } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";

import {
  fetchCollections as apiFetchCollections,
  fetchTags as apiFetchTags,
  createCollectionAPI,
  createBookmarksAPI,
  BookmarkCreationData,
} from "../lib/raindrop-api";
import { getAiSuggestions } from "../lib/ai-suggestions";

// Define Preferences interface locally or move to types.ts if preferred
interface Preferences {
  token: string;
  aiTaggingEnabled?: boolean;
  // Add other preferences used in this file if necessary
}

// Define TagItem interface matching useTags hook structure if possible
interface TagItem {
  _id: string;
  count?: number; // Assuming count might be present from types.ts
}

type CreateFormProps = {
  isLoading?: boolean;
  defaultLink?: string;
  onWillCreate?: () => void;
  onCreated?: () => void;
  onError?: (error: Error) => void;
};

async function getLinkTitle(link: string): Promise<string> {
  return fetch(link)
    .then((response: Response) => response.text())
    .then((html: string) => {
      const match = html.match(/<title>(.*?)<\/title>/i);
      const title = match ? match[1] : "";
      return title;
    })
    .catch((error: Error) => {
      console.error("Error fetching title:", error);
      return "";
    });
}

export const CreateForm = (props: CreateFormProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const { aiTaggingEnabled } = preferences;

  const [collectionCache] = useCachedState("selected-collection", "-1");
  const { collections } = useRequest({ collection: collectionCache });
  const { data: tagsData } = useTags();

  const [dropdownValue, setDropdownValue] = useState("-1");
  const [showCollectionCreation, setShowCollectionCreation] = useState(false);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastSuggestedUrl, setLastSuggestedUrl] = useState<string | undefined>(undefined);
  const [newSuggestedTags, setNewSuggestedTags] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, setValue, reset, focus, values } = useForm<FormValues>({
    async onSubmit(values: FormValues) {
      props.onWillCreate?.();
      setIsSubmitting(true);

      try {
        let finalCollectionId = values.collection;

        if (showCollectionCreation && values.newCollection) {
          try {
            const newCollection = await createCollectionAPI(values.newCollection);
            finalCollectionId = newCollection._id.toString();
          } catch (error) {
            console.error("Failed to create new collection:", error);
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to Create Collection",
              message: error instanceof Error ? error.message : String(error),
            });
            setIsSubmitting(false);
            return;
          }
        }

        const itemsToCreate: BookmarkCreationData[] = values.link
          .split(/[ ,;]/)
          .map((link) => ({
            link: link.trim(),
            title: values.title,
            collectionId: finalCollectionId,
            tags: values.tags,
            pleaseParse: {},
          }))
          .filter((item) => item.link);

        if (itemsToCreate.length === 0) {
          showToast({ style: Toast.Style.Failure, title: "No valid links found" });
          setIsSubmitting(false);
          return;
        }

        const response = await createBookmarksAPI(itemsToCreate);

        console.log("API Response from createBookmarksAPI:", response);
        reset({ link: "", collection: "-1", tags: [] });
        focus("link");
        props.onCreated?.();
      } catch (error) {
        console.error("Submission Error:", error);
        if (error instanceof Error) {
          if (!String(error.message).includes("Failed to create collection")) {
            showToast({ style: Toast.Style.Failure, title: "Error Adding Link(s)", message: error.message });
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      link: (value: string | undefined) => {
        if (!value) return "The item must not be empty";
        if (!value.match(/^(https?|file):\/\//i)) {
          return "Please enter a valid URL (starting with http://, https://, or file://)";
        }
        return undefined;
      },
      newCollection: (value: string | undefined) => {
        if (showCollectionCreation && (!value || value.trim() === "")) {
          return "This field is required";
        }
        return undefined;
      },
    },
    initialValues: {
      link: props.defaultLink ?? "",
      title: undefined,
      collection: "-1",
      tags: [],
    },
  });

  useEffect(() => {
    if (props.defaultLink) {
      setValue("link", props.defaultLink);
      getLinkTitle(props.defaultLink).then((title) => {
        setValue("title", title);
      });
    }
  }, [props.defaultLink, setValue]);

  const triggerAiSuggestions = useCallback(
    async (url: string | undefined) => {
      if (!url || url === lastSuggestedUrl || !aiTaggingEnabled || isAiLoading) {
        return;
      }
      if (!url.match(/^(https?|file):\/\//i)) {
        return;
      }

      setIsAiLoading(true);
      let suggestionsApplied = false;
      try {
        const [currentTags, currentCollections]: [string[], Collection[]] = await Promise.all([
          apiFetchTags(),
          apiFetchCollections(),
        ]);
        const validCollections = currentCollections.filter(
          (c: Collection) => typeof c._id === "number" && !isNaN(c._id),
        );

        if (currentTags.length === 0 && validCollections.length === 0) {
          console.log("Skipping AI suggestions: No tag/collection context available from API.");
          return;
        }

        const suggestions = await getAiSuggestions(url, currentTags, validCollections);

        if (suggestions) {
          setValue("tags", suggestions.suggestedTags);

          const newlySuggested = suggestions.suggestedTags.filter(
            (suggestedTag) => !currentTags.includes(suggestedTag),
          );
          setNewSuggestedTags(newlySuggested);

          if (suggestions.suggestedCollectionId !== null) {
            const suggestedIdStr = suggestions.suggestedCollectionId.toString();
            const collectionExists = validCollections.some((c: Collection) => c._id.toString() === suggestedIdStr);
            if (collectionExists) {
              setValue("collection", suggestedIdStr);
              setDropdownValue(suggestedIdStr);
            }
          }
          suggestionsApplied = true;
        }
      } catch (error) {
        console.error("Error triggering AI suggestions (or fetching context):", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to get AI context",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsAiLoading(false);
        if (suggestionsApplied) {
          setLastSuggestedUrl(url);
        }
      }
    },
    [aiTaggingEnabled, isAiLoading, setValue, lastSuggestedUrl, tagsData],
  );

  useEffect(() => {
    if (!values.link) {
      setLastSuggestedUrl(undefined);
      setNewSuggestedTags([]);
    }
    triggerAiSuggestions(values.link);
  }, [values.link, triggerAiSuggestions]);

  // --- Prepare tags for TagPicker ---
  const existingTagItems = tagsData?.items ?? [];
  const existingTagIds = existingTagItems.map((t) => t._id);
  const selectedTagIds = values.tags ?? []; // Tags currently selected in the form

  // Combine existing tags and currently selected tags, ensuring uniqueness
  const allTagIdsToRender = [...new Set([...existingTagIds, ...selectedTagIds])];
  // --- End Prepare tags ---

  // Use the Collection type from the hook if it's defined and suitable
  // Or define a local type matching the hook's return structure
  interface DropdownCollectionItem {
    value?: number | string; // Adjust based on useRequest return type
    label: string;
    name?: string;
  }

  return (
    <Form
      isLoading={props.isLoading || isAiLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.link}
        title="Link"
        placeholder="https://example.com"
        info="You can add multiple links separated by commas, spaces, or semicolons."
        autoFocus
      />
      <Form.TextField {...itemProps.title} title="Title" placeholder="Example title" />
      <Form.Dropdown
        {...itemProps.collection}
        title="Collection"
        value={dropdownValue}
        onChange={(newValue: string) => {
          setShowCollectionCreation(newValue === "-2");
          setValue("collection", newValue);
          setDropdownValue(newValue);
        }}
      >
        <Form.Dropdown.Item key="-2" value="-2" title="Create Collection" icon={Icon.Plus} />
        <Form.Dropdown.Item key="-1" value="-1" title="Unsorted" icon={Icon.Tray} />
        <Form.Dropdown.Section title="Collections">
          {collections.map(({ value, label, name }: DropdownCollectionItem) => (
            <Form.Dropdown.Item
              key={value}
              value={`${value ?? "-1"}`}
              title={name ? `${name} (${label})` : label}
              icon={Icon.Folder}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {showCollectionCreation && (
        <Form.TextField {...itemProps.newCollection} title="New Collection" placeholder="Name" />
      )}
      <Form.TagPicker {...itemProps.tags} title="Tags">
        {/* Render items based on the combined list */}
        {allTagIdsToRender.map((tagId) => {
          // Determine icon: If this tagId is in our state of newly suggested tags, show the icon.
          // Revert back to Icon.Stars
          const icon = newSuggestedTags.includes(tagId) ? Icon.Stars : undefined;

          return <Form.TagPicker.Item key={tagId} value={tagId} title={tagId} icon={icon} />;
        })}
      </Form.TagPicker>
    </Form>
  );
};
