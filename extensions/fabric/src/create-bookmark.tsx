import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, withAccessToken } from "@raycast/utils";

import { CreateBookmarkParams, getFabricClient, oauthService } from "./api/fabricClient";
import { useTags } from "./hooks/useTags";
import { useFolders } from "./hooks/useFolders";

type CreationValues = {
  url: string;
  comment: string;
  tagsNew: string;
  tagsExisting: string[];
  parentId: string;
};

function CreateBookmark() {
  const tags = useTags();
  const folders = useFolders();

  const { handleSubmit, itemProps, reset } = useForm<CreationValues>({
    async onSubmit(values: CreateBookmarkParams) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving bookmark...",
      });

      try {
        const fabricClient = getFabricClient();
        await fabricClient.createBookmark(values);

        reset({
          url: "",
          comment: "",
        });

        toast.style = Toast.Style.Success;
        toast.title = "Bookmark saved";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save bookmark";
      }
    },
    validation: {
      url: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Link" placeholder="Type or paste a link..." {...itemProps.url} />
      <Form.TextArea title="Comment" placeholder="Say something about it (optional)" {...itemProps.comment} />
      <Form.Separator />
      <Form.Dropdown title="Folder" placeholder="Select a folder" {...itemProps.parentId}>
        <Form.Dropdown.Item value="@alias::inbox" title="Inbox" icon="📥" />
        {folders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id}
            title={folder.name}
            icon={folder.parent ? "📁" : "🗂️"}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker title="Existing Tags" placeholder="Assign existing tags" {...itemProps.tagsExisting}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        title="New Tags"
        placeholder="Create new tags"
        info="Comma separated list."
        {...itemProps.tagsNew}
      />
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateBookmark);
