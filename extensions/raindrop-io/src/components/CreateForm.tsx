import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { FormValues } from "../types";

import { useRequest } from "../hooks/useRequest";
import { useTags } from "../hooks/useTags";
import { createBookmark, getLinkTitle } from "../helpers/utils";

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
      title: undefined,
      collection: "-1",
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
        onBlur={(event) => {
          const link = event.target.value;
          if (link) {
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
          {collections.map(({ value, label, name }) => (
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
        {tags?.items?.map(({ _id }) => <Form.TagPicker.Item key={_id} value={_id} title={_id} />)}
      </Form.TagPicker>
    </Form>
  );
};
