import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, withAccessToken } from "@raycast/utils";

import { CreateNotepadParams, getFabricClient, oauthService } from "./api/fabricClient";
import { useTags } from "./hooks/useTags";
import { useFolders } from "./hooks/useFolders";

type CreationValues = {
  name: string;
  content: string;
  tagsNew: string;
  tagsExisting: string[];
  parentId: string;
};

function CreateNote() {
  const tags = useTags();
  const folders = useFolders();

  const { handleSubmit, itemProps, reset } = useForm<CreationValues>({
    async onSubmit(values: CreateNotepadParams) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving note...",
      });

      try {
        const fabricClient = getFabricClient();
        await fabricClient.createNotepad(values);

        reset({
          name: "",
          content: "",
          tagsNew: "",
          parentId: "@alias::inbox",
          tagsExisting: [],
        });

        toast.style = Toast.Style.Success;
        toast.title = "Note saved";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save note";
      }
    },
    validation: {
      content: FormValidation.Required,
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
      <Form.TextField title="Title" placeholder="Untitled note" {...itemProps.name} />
      <Form.TextArea
        title="Content"
        info="Supports markdown syntax."
        placeholder="Type something here..."
        autoFocus={true}
        enableMarkdown={true}
        {...itemProps.content}
      />
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

export default withAccessToken(oauthService)(CreateNote);
