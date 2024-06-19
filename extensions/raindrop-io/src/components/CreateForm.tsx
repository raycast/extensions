import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { CollectionCreationResponse, FormValues, Preferences } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";

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

export const CreateForm = (props: CreateFormProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { data: tags } = useTags();
  const [dropdownValue, setDropdownValue] = useState("-1");
  const [showCollectionCreation, setShowCollectionCreation] = useState(false);
  const { handleSubmit, itemProps, setValue, reset, focus } = useForm<FormValues>({
    async onSubmit(values) {
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
      link: FormValidation.Required,
      newCollection: (value) => {
        if (showCollectionCreation && value === "") {
          return "This field is required";
        }
      },
    },
    initialValues: {
      link: props.defaultLink ?? "",
      collection: "-1",
    },
  });

  useEffect(() => {
    if (props.defaultLink) {
      setValue("link", props.defaultLink);
    }
  }, [props.defaultLink, setValue]);

  return (
    <Form
      isLoading={props.isLoading}
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
        {collections.map(({ value, label }) => (
          <Form.Dropdown.Item key={value} value={`${value ?? "-1"}`} title={label} icon={Icon.Folder} />
        ))}
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
