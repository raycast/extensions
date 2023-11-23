import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState, useForm, FormValidation } from "@raycast/utils";
import { FormValues, Preferences, CollectionCreationResponse } from "./types";
import fetch from "node-fetch";
import { useState } from "react";

import { useRequest } from "./hooks/useRequest";
import { useTags } from "./hooks/useTags";

const AddBookmarks = () => {
  const preferences: Preferences = getPreferenceValues();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { data: tags } = useTags();
  const [dropdownValue, setDropdownValue] = useState<string>("-1");
  const [showCollectionCreation, setShowCollectionCreation] = useState<boolean>(false);

  const onDropdownValueChange = (newValue: string) => {
    if (newValue === "-2") {
      setShowCollectionCreation(true);
    } else {
      setShowCollectionCreation(false);
    }
    setDropdownValue(newValue);
  };

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding Link");
      let newCollectionData: CollectionCreationResponse;
      try {
        if (showCollectionCreation) {
          console.log(values.newCollection);
          const newCollectionResponse = await fetch("https://api.raindrop.io/rest/v1/collection", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${preferences.token}`,
            },
            body: JSON.stringify({
              title: values.newCollection,
              parent: {
                $id: {},
              },
            }),
          });
          newCollectionData = (await newCollectionResponse.json()) as CollectionCreationResponse;
        }
        fetch("https://api.raindrop.io/rest/v1/raindrops", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.token}`,
          },
          body: JSON.stringify({
            items: values.link.split(/[ ,;]/).map((link) => ({
              link: link.trim(),
              collectionId: showCollectionCreation
                ? newCollectionData.item._id.toString()
                : values.collection,
              tags: values.tags,
              pleaseParse: {},
            })),
          }),
        }).then(async (res) => {
          if (res.status === 200) {
            toast.style = Toast.Style.Success;
            toast.title = "Link Added";
            toast.message = values.link;
            reset({ link: "", collection: "-1", tags: [] });
            return res.json();
          } else {
            throw new Error("Error adding link");
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Error Adding Link";
          toast.message = error.message;
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
      collection: "-1",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Link"
        placeholder="https:// (You can add multiple links)"
        autoFocus
        {...itemProps.link}
      />
      <Form.Dropdown
        title="Collection"
        {...itemProps.collection}
        value={dropdownValue}
        onChange={onDropdownValueChange}
      >
        <Form.Dropdown.Item key={"-2"} value={"-2"} title={"Create Collection"} icon={Icon.Plus} />

        <Form.Dropdown.Item key={"-1"} value={"-1"} title={"Unsorted"} icon={Icon.Tray} />
        {collections.map((collection) => {
          return (
            <Form.Dropdown.Item
              key={collection.value}
              value={collection.value ? collection.value.toString() : "-1"}
              title={collection.label}
              icon={Icon.Folder}
            />
          );
        })}
      </Form.Dropdown>
      {showCollectionCreation && (
        <Form.TextField title="New Collection" placeholder="Name" {...itemProps.newCollection} />
      )}
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags?.items?.map((tag) => {
          return <Form.TagPicker.Item key={tag._id} value={tag._id} title={tag._id} />;
        })}
      </Form.TagPicker>
    </Form>
  );
};

export default AddBookmarks;
