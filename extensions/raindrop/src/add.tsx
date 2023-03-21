import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Preferences } from "./types";
import fetch from "node-fetch";

import { useRequest } from "./hooks/useRequest";
import { useTags } from "./hooks/useTags";

const AddBookmarks = () => {
  const preferences: Preferences = getPreferenceValues();
  const [collection] = useCachedState("selected-collection", "0");
  const { collections } = useRequest({ collection });
  const { data: tags } = useTags();

  async function handleAddBookmark(e: Form.Values) {
    const toast = await showToast(Toast.Style.Animated, "Adding Link");
    try {
      fetch("https://api.raindrop.io/rest/v1/raindrop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.token}`,
        },
        body: JSON.stringify({
          link: e.link,
          collectionId: e.collection,
          tags: e.tags,
        }),
      }).then((res) => {
        if (res.status === 200) {
          toast.style = Toast.Style.Success;
          toast.title = "Link Added";
          toast.message = e.link;
          return res.json();
        } else {
          throw new Error("Error adding link");
        }
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error Adding Link";
      // @ts-expect-error - error.message is a string
      toast.message = error.message;
    }
  }

  return (
    <Form
      actions={[
        <ActionPanel key={"submit-panel"}>
          <Action.SubmitForm key={0} onSubmit={handleAddBookmark} />
        </ActionPanel>,
      ]}
    >
      <Form.TextField id="link" title="Link" placeholder="Enter Link" />
      <Form.Dropdown id="collection" title="Collection" defaultValue="-1">
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
      <Form.TagPicker id="tags" title="Tags">
        {tags?.items?.map((tag) => {
          return <Form.TagPicker.Item key={tag._id} value={tag._id} title={tag._id} />;
        })}
      </Form.TagPicker>
    </Form>
  );
};

export default AddBookmarks;
