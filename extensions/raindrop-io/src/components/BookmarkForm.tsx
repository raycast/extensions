import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { FormValues } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";
import { createCollection, createBookmark, getLinkTitle } from "../helpers/utils";

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
  const mode = props.bookmarkId ? "edit" : "create";
  const preferences = getPreferenceValues<Preferences>();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { data: tags } = useTags();
  const [dropdownValue, setDropdownValue] = useState(props.defaultValues?.collection ?? "-1");
  const [showCollectionCreation, setShowCollectionCreation] = useState(false);
  const linkRef = useRef<string>(props.defaultValues?.link ?? "");
  const { handleSubmit, itemProps, setValue, reset, focus } = useForm<FormValues>({
    async onSubmit(values) {
      props.onWillSave?.();

      try {
        const response =
          mode === "edit" && props.bookmarkId
            ? await updateBookmark({
                preferences,
                values,
                bookmarkId: props.bookmarkId,
                showCollectionCreation,
              })
            : await createBookmark({
                preferences,
                values,
                showCollectionCreation,
              });

        if (response.status === 200) {
          if (mode !== "edit") {
            reset({ link: "", collection: "-1", tags: [] });
            focus("link");
          }
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
    validation: {
      link: FormValidation.Required,
      newCollection: (value) => {
        if (showCollectionCreation && value === "") {
          return "This field is required";
        }
      },
    },
    initialValues: {
      link: props.defaultLink ?? "",
      title: undefined,
      collection: "-1",
      ...props.defaultValues,
    },
  });

  useEffect(() => {
    if (props.defaultLink) {
      setValue("link", props.defaultLink);
    }
  }, [props.defaultLink, setValue]);

  useEffect(() => {
    if (props.defaultLink) {
      getLinkTitle(props.defaultLink).then((title) => {
        setValue("title", title);
      });
    }
  }, [props.defaultLink]);

  return (
    <Form
      isLoading={props.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "edit" ? "Update Bookmark" : "Add Bookmark"}
            icon={mode === "edit" ? Icon.Pencil : Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
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
        {tags?.items?.map(({ _id }) => <Form.TagPicker.Item key={_id} value={_id} title={_id} />)}
      </Form.TagPicker>
    </Form>
  );
};
