import { Action, ActionPanel, Form, getPreferenceValues, Icon, AI, environment, Toast, showToast } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import fetch, { Response } from "node-fetch";
import { useEffect, useState, useCallback, FormEvent } from "react";
import { CollectionCreationResponse, FormValues } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";

import {
  fetchCollections as apiFetchCollections,
  fetchTags as apiFetchTags,
  Collection as ApiCollection,
} from "../lib/raindrop-api";
import { getAiSuggestions, AISuggestions } from "../lib/ai-suggestions";

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

async function createCollection({
  preferences,
  title,
}: {
  preferences: Preferences;
  title: string;
}): Promise<CollectionCreationResponse> {
  const response = await fetch("https://api.raindrop.io/rest/v1/collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({ title, parent: { $id: {} } }),
  });

  return (await response.json()) as CollectionCreationResponse;
}

async function createBookmark({
  preferences,
  values,
  showCollectionCreation,
}: {
  preferences: Preferences;
  values: FormValues;
  showCollectionCreation: boolean;
}) {
  let collectionId = values.collection;

  if (showCollectionCreation && values.newCollection) {
    collectionId = await createCollection({
      preferences,
      title: values.newCollection,
    }).then((data) => data.item._id.toString());
  }

  return fetch("https://api.raindrop.io/rest/v1/raindrops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({
      items: values.link.split(/[ ,;]/).map((link) => ({
        link: link.trim(),
        title: values.title,
        collectionId,
        tags: values.tags,
        pleaseParse: {},
      })),
    }),
  });
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

  const { handleSubmit, itemProps, setValue, reset, focus, values } = useForm<FormValues>({
    async onSubmit(values: FormValues) {
      props.onWillCreate?.();

      try {
        const response = await createBookmark({
          preferences,
          values,
          showCollectionCreation,
        });

        if (response.status === 200) {
          reset({ link: "", collection: "-1", tags: [] });
          focus("link");
          props.onCreated?.();
        } else {
          throw new Error(response.statusText);
        }
      } catch (error) {
        if (error instanceof Error) {
          props.onError?.(error);
        }
      }
    },
    validation: {
      link: (value: string | undefined) => {
        if (!value) return "The item must't be empty";
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
      if (!url || url === lastSuggestedUrl || !aiTaggingEnabled || !environment.canAccess(AI) || isAiLoading) {
        return;
      }
      if (!url.match(/^(https?|file):\/\//i)) {
        return;
      }
      if (isAiLoading) return;

      setIsAiLoading(true);
      let suggestionsApplied = false;
      try {
        const [currentTags, currentCollections] = await Promise.all([apiFetchTags(), apiFetchCollections()]);
        const validCollections = currentCollections.filter((c) => typeof c._id === "number" && !isNaN(c._id));

        if (currentTags.length === 0 && validCollections.length === 0) {
          console.log("Skipping AI suggestions: No tag/collection context available from API.");
          return;
        }

        const suggestions = await getAiSuggestions(url, currentTags, validCollections);

        if (suggestions) {
          setValue("tags", suggestions.suggestedTags);
          if (suggestions.suggestedCollectionId !== null) {
            const suggestedIdStr = suggestions.suggestedCollectionId.toString();
            const collectionExists = validCollections.some((c) => c._id.toString() === suggestedIdStr);
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
    [aiTaggingEnabled, isAiLoading, setValue, lastSuggestedUrl],
  );

  useEffect(() => {
    if (!values.link) {
      setLastSuggestedUrl(undefined);
    }
    triggerAiSuggestions(values.link);
  }, [values.link, triggerAiSuggestions]);

  // Use the Collection type from the hook if it's defined and suitable
  // Or define a local type matching the hook's return structure
  interface DropdownCollectionItem {
    value?: number | string; // Adjust based on useRequest return type
    label: string;
    name?: string;
  }

  return (
    <Form
      isLoading={props.isLoading || isAiLoading}
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
        {tagsData?.items?.map(({ _id }: TagItem) => <Form.TagPicker.Item key={_id} value={_id} title={_id} />)}
      </Form.TagPicker>
    </Form>
  );
};
