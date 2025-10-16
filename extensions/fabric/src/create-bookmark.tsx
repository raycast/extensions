import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, withAccessToken } from "@raycast/utils";

import { CreateBookmarkParams, getFabricClient, oauthService } from "./api/fabricClient";
import { CreationMetadata } from "./components/CreationMetadata";

type CreationValues = {
  url: string;
  comment: string;
  tagsNew: string;
  tagsExisting: string[];
  parentId: string;
};

function CreateBookmark() {
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
      <CreationMetadata<CreationValues> itemProps={itemProps} />
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateBookmark);
