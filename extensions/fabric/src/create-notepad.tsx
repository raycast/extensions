import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, withAccessToken } from "@raycast/utils";

import { CreateNotepadParams, getFabricClient, oauthService } from "./api/fabricClient";
import { CreationMetadata } from "./components/CreationMetadata";

type CreationValues = {
  name: string;
  content: string;
  tagsNew: string;
  tagsExisting: string[];
  parentId: string;
};

function CreateNote() {
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
      <CreationMetadata<CreationValues> itemProps={itemProps} />
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateNote);
