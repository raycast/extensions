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
import { FormValues, Preferences } from "./types";
import fetch from "node-fetch";

import { useRequest } from "./hooks/useRequest";
import { useTags } from "./hooks/useTags";

const AddBookmarks = () => {
  const preferences: Preferences = getPreferenceValues();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { data: tags } = useTags();

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding Link");
      try {
        fetch("https://api.raindrop.io/rest/v1/raindrop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.token}`,
          },
          body: JSON.stringify({
            link: values.link,
            collectionId: values.collection,
            tags: values.tags,
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
      <Form.TextField title="Link" placeholder="https://" autoFocus {...itemProps.link} />
      <Form.Dropdown title="Collection" {...itemProps.collection}>
        <Form.Dropdown.Item key={"-1"} value={"-1"} title={"Unsorted"} />
        {collections.map((collection) => {
          return (
            <Form.Dropdown.Item
              key={collection.value}
              value={collection.value ? collection.value.toString() : "-1"}
              title={collection.label}
            />
          );
        })}
      </Form.Dropdown>
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags?.items?.map((tag) => {
          return <Form.TagPicker.Item key={tag._id} value={tag._id} title={tag._id} />;
        })}
      </Form.TagPicker>
    </Form>
  );
};

export default AddBookmarks;
