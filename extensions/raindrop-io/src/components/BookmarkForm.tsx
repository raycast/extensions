import { Action, ActionPanel, Form, getPreferenceValues, Icon, useNavigation } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { FormValues, Bookmark } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";
import { useRaycastAi } from "../hooks/useRaycastAi";
import { useGemini } from "../hooks/useGemini";
import { createCollection, createBookmark, getLinkTitle } from "../helpers/utils";
import { SearchResult, searchForExistingBookmark } from "../helpers/search";
import { ExistingBookmarkDetail } from "./ExistingBookmarkDetail";

async function updateBookmark({
  preferences,
  values,
  bookmarkId,
  showCollectionCreation,
}: {
  preferences: Preferences;
  values: FormValues;
  bookmarkId: number;
  showCollectionCreation: boolean;
}) {
  let collectionId = values.collection;

  if (showCollectionCreation && values.newCollection) {
    collectionId = await createCollection({
      preferences,
      title: values.newCollection,
    }).then((data) => data.item._id.toString());
  }

  return fetch(`https://api.raindrop.io/rest/v1/raindrop/${bookmarkId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({
      link: values.link.trim(),
      title: values.title,
      collectionId,
      tags: values.tags,
      pleaseParse: {},
    }),
  });
}

type BookmarkFormProps = {
  isLoading?: boolean;
  defaultLink?: string;
  onWillSave?: () => void;
  onSaved?: () => void;
  onError?: (error: Error) => void;
  mode?: "create" | "edit";
  bookmarkId?: number;
  defaultValues?: Partial<FormValues>;
};

export const BookmarkForm = (props: BookmarkFormProps) => {
  const { push } = useNavigation();
  const mode = props.bookmarkId ? "edit" : "create";
  const preferences = getPreferenceValues<Preferences>();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { suggestAndApply: suggestWithGemini, newlyCreatedTags: geminiTags } = useGemini();
  const { suggestAndApply: suggestWithRaycast, newlyCreatedTags: raycastTags } = useRaycastAi();
  const newlyCreatedTags = [...new Set([...geminiTags, ...raycastTags])];
  const { data: tags } = useTags();
  const [dropdownValue, setDropdownValue] = useState(props.defaultValues?.collection ?? "-1");
  const [showCollectionCreation, setShowCollectionCreation] = useState(false);
  const [existingBookmark, setExistingBookmark] = useState<SearchResult>(null);
  const [searching, setSearching] = useState(false);
  const [showingExistingData, setShowingExistingData] = useState(mode === "edit");
  const linkRef = useRef<string>(props.defaultValues?.link ?? "");
  const originalValues = useRef<FormValues | null>(null);
  const { handleSubmit, itemProps, setValue, reset, focus } = useForm<FormValues>({
    onSubmit: async (values) => {
      props.onWillSave?.();
      try {
        const response = await createBookmark({
          preferences,
          values,
          showCollectionCreation,
        });

        if (response.status === 200) {
          reset({ link: "", collection: "-1", tags: [] } as Partial<FormValues>);
          focus("link");
          props.onSaved?.();
        } else {
          throw new Error(response.statusText);
        }
      } catch (error) {
        if (error instanceof Error) {
          props.onError?.(error);
        }
      }
    },
    initialValues: props.defaultValues,
    validation: {
      link: (value) => {
        if (!value || value.trim().length === 0) {
          return "Link is required";
        }
        try {
          new URL(value);
        } catch {
          return "Invalid URL";
        }
      },
    },
  });

  const handleEditBookmark = (bookmark: Bookmark) => {
    push(
      <BookmarkForm
        mode="edit"
        bookmarkId={bookmark._id}
        defaultValues={{
          link: bookmark.link,
          title: bookmark.title,
          collection: bookmark.collection?.$id?.toString() ?? "-1",
          tags: bookmark.tags,
        }}
        onSaved={props.onSaved}
        onWillSave={props.onWillSave}
        onError={props.onError}
      />,
    );
  };

  useEffect(() => {
    if (props.defaultLink) {
      setValue("link", props.defaultLink);
      // Also trigger a search when defaultLink is set
      const searchExistingBookmark = async () => {
        setSearching(true);
        try {
          const result = await searchForExistingBookmark(props.defaultLink);
          setExistingBookmark(result);
        } catch (error) {
          console.error("Error searching for existing bookmark:", error);
          setExistingBookmark(null);
        } finally {
          setSearching(false);
        }
      };

      if (props.defaultLink.trim() !== "") {
        searchExistingBookmark();
      }
    }
  }, [props.defaultLink, setValue]);

  useEffect(() => {
    if (props.defaultLink && typeof props.defaultLink === "string") {
      getLinkTitle(props.defaultLink).then((title) => {
        setValue("title", title);
      });
    }
  }, [props.defaultLink]);

  // Search for existing bookmark when link value changes
  useEffect(() => {
    const link = itemProps.link.value;
    if (typeof link === "string" && link) {
      const searchExistingBookmark = async () => {
        setSearching(true);
        try {
          const result = await searchForExistingBookmark(link);
          setExistingBookmark(result);
        } catch (error) {
          console.error("Error searching for existing bookmark:", error);
          setExistingBookmark(null);
        } finally {
          setSearching(false);
        }
      };

      if (link.trim() !== "") {
        // Use a timeout to debounce the search
        const timeoutId = setTimeout(searchExistingBookmark, 500);
        // Update the ref after the timeout to avoid immediate re-search
        linkRef.current = link;
        return () => clearTimeout(timeoutId);
      } else {
        setExistingBookmark(null);
        linkRef.current = link;
      }
    }
  }, [itemProps.link.value]);

  return (
    <Form
      isLoading={props.isLoading || searching}
      actions={
        <ActionPanel>
          {existingBookmark ? (
            showingExistingData ? (
              // When showing existing data, show "Save Update" and "Cancel Update"
              <>
                <Action.SubmitForm
                  title="Save Update"
                  icon={Icon.Pencil}
                  onSubmit={async (values) => {
                    props.onWillSave?.();

                    try {
                      const response = await updateBookmark({
                        preferences,
                        values,
                        bookmarkId: existingBookmark.bookmark._id,
                        showCollectionCreation,
                      });

                      if (response.status === 200) {
                        props.onSaved?.();
                      } else {
                        throw new Error(response.statusText);
                      }
                    } catch (error) {
                      if (error instanceof Error) {
                        props.onError?.(error);
                      }
                    }
                  }}
                />
                <Action
                  title="Cancel Update"
                  icon={Icon.XmarkCircle}
                  onAction={() => {
                    // Revert back to the original values
                    if (originalValues.current) {
                      setValue("link", originalValues.current.link || "");
                      setValue("title", originalValues.current.title);
                      setValue("collection", originalValues.current.collection || "-1");
                      setValue("tags", originalValues.current.tags || []);
                    }

                    // Update the UI state back to the original state
                    setShowingExistingData(false);
                  }}
                />
              </>
            ) : (
              // When NOT showing existing data, show "Update Existing" and "Add Bookmark Anyway"
              <>
                <Action.Push
                  title={`Show ${existingBookmark.matchType === "exact" ? "Existing" : "Similar"} Bookmark Details`}
                  icon={Icon.Sidebar}
                  target={<ExistingBookmarkDetail bookmark={existingBookmark.bookmark} onEdit={handleEditBookmark} />}
                />
                <Action
                  title="Update Existing Bookmark"
                  icon={Icon.Pencil}
                  onAction={async () => {
                    // Store the original values to be able to cancel later
                    originalValues.current = {
                      link: itemProps.link.value || "",
                      title: itemProps.title.value,
                      collection: itemProps.collection.value,
                      tags: itemProps.tags.value || [],
                      newCollection: itemProps.newCollection?.value,
                    };

                    // Populate the form with the existing bookmark data
                    setValue("link", existingBookmark.bookmark.link);
                    setValue("title", existingBookmark.bookmark.title);
                    const collectionValue = existingBookmark.bookmark.collection?.$id.toString() || "-1";
                    setValue("collection", collectionValue);
                    setDropdownValue(collectionValue); // Update the dropdown state as well
                    setValue("tags", existingBookmark.bookmark.tags || []);

                    // Update the UI state to show we're now editing the existing data
                    setShowingExistingData(true);
                  }}
                />
                <Action
                  title="Add Bookmark Anyway"
                  icon={Icon.PlusCircle}
                  onAction={async () => {
                    // Get the current form values and submit as a new bookmark
                    const values = {
                      link: itemProps.link.value || "",
                      title: itemProps.title.value,
                      collection: itemProps.collection.value,
                      tags: itemProps.tags.value || [],
                      newCollection: itemProps.newCollection?.value,
                    };

                    props.onWillSave?.();

                    try {
                      const response = await createBookmark({
                        preferences,
                        values,
                        showCollectionCreation,
                      });

                      if (response.status === 200) {
                        reset({ link: "", collection: "-1", tags: [] });
                        focus("link");
                        props.onSaved?.();
                      } else {
                        throw new Error(response.statusText);
                      }
                    } catch (error) {
                      if (error instanceof Error) {
                        props.onError?.(error);
                      }
                    }
                  }}
                />
              </>
            )
          ) : (
            // When no existing bookmark, normal "Add Bookmark" action
            <Action.SubmitForm title="Add Bookmark" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
          )}
          {mode === "create" && (
            <Action
              title="Use AI Tagging"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={async () => {
                const suggestFn = preferences.aiProvider === "gemini" ? suggestWithGemini : suggestWithRaycast;
                await suggestFn({
                  link: (itemProps.link.value as string) || "",
                  title: (itemProps.title.value as string) || "",
                  collections: collections.map((c) => ({ _id: c.value as number, title: c.name as string })),
                  tags,
                  currentTags: (itemProps.tags.value as string[]) || [],
                  setValue,
                  setDropdownValue,
                });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.link}
        title="Link"
        placeholder="https://example.com"
        info={mode === "edit" ? undefined : "You can add multiple links separated by commas, spaces, or semicolons."}
        autoFocus
        onBlur={(event) => {
          const link = event.target.value;
          if (link && link !== linkRef.current) {
            // Fetch title if the link has changed
            linkRef.current = link;
            getLinkTitle(link).then((title) => {
              setValue("title", title);
            });
          }
        }}
      />
      <Form.TextField {...itemProps.title} title="Title" placeholder="Example title" />
      <Form.Dropdown
        {...itemProps.collection}
        title="Collection"
        value={dropdownValue}
        onChange={(newValue: string) => {
          setShowCollectionCreation(newValue === "-2");
          setDropdownValue(newValue);
        }}
      >
        <Form.Dropdown.Item key="-2" value="-2" title="Create Collection" icon={Icon.Plus} />
        <Form.Dropdown.Item key="-1" value="-1" title="Unsorted" icon={Icon.Tray} />
        <Form.Dropdown.Section title="Collections">
          {collections.map(({ value, label, name, cover }) => (
            <Form.Dropdown.Item
              key={value}
              value={`${value ?? "-1"}`}
              title={name ? `${name} (${label})` : label}
              icon={cover ? { source: cover } : { source: Icon.Folder }}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {showCollectionCreation && (
        <Form.TextField {...itemProps.newCollection} title="New Collection" placeholder="Name" />
      )}
      <Form.TagPicker {...itemProps.tags} title="Tags">
        {(tags?.items || []).map(({ _id }) => (
          <Form.TagPicker.Item key={_id} value={_id} title={_id} />
        ))}
        {newlyCreatedTags.map((tag) => {
          if (!tags?.items?.some((item) => item._id === tag)) {
            return <Form.TagPicker.Item key={tag} value={tag} title={tag} />;
          }
          return null;
        })}
      </Form.TagPicker>
    </Form>
  );
};
