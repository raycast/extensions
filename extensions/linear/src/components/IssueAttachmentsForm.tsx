import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { attachLinkUrl, createAttachment } from "../api/attachments";
import { IssueResult } from "../api/getIssues";
import { getErrorMessage } from "../helpers/errors";
import { getLinksFromNewLines } from "../helpers/links";

type IssueAttachmentValues = {
  attachments: string[];
  links: string;
};

type IssueAttachmentsFormProps = {
  issue: IssueResult;
};

export function IssueAttachmentsForm({ issue: { id: issueId, title, identifier } }: IssueAttachmentsFormProps) {
  const { pop } = useNavigation();
  const { reset, itemProps, handleSubmit } = useForm<IssueAttachmentValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Attaching links" });
      const links = getLinksFromNewLines(values.links);

      if (links.length === 0 && values.attachments.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No links or attachments provided";
        return;
      }

      if (links.length > 0) {
        const linkWord = links.length === 1 ? "link" : "links";
        try {
          await Promise.all(
            links.map((link) =>
              attachLinkUrl({
                issueId,
                url: link,
              }),
            ),
          );
          toast.style = Toast.Style.Success;
          toast.title = `Successfully attached ${linkWord}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed attaching ${linkWord}`;
          toast.message = getErrorMessage(error);
        }
      }

      if (values.attachments.length > 0) {
        const attachmentWord = values.attachments.length === 1 ? "attachment" : "attachments";

        try {
          toast.style = Toast.Style.Animated;
          toast.title = `Uploading ${attachmentWord}…`;
          await Promise.all(
            values.attachments.map((attachment) =>
              createAttachment({
                issueId,
                url: attachment,
              }),
            ),
          );
          toast.style = Toast.Style.Success;
          toast.title = `Successfully uploaded ${attachmentWord}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed uploading ${attachmentWord}`;
          toast.message = getErrorMessage(error);
        }
      }

      reset({
        attachments: [],
        links: "",
      });

      pop();
    },
    initialValues: {
      links: "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.NewDocument} title="Attach" />
        </ActionPanel>
      }
      navigationTitle="Add Attachments and Links"
    >
      <Form.Description title="Issue" text={`[${identifier}] ${title}`} />
      <Form.FilePicker title="Attachment" {...itemProps.attachments} />
      <Form.TextArea
        title={"Links"}
        placeholder={"https://a.com\nhttps://b.com\nNew link(s) on separate line(s)"}
        {...itemProps.links}
      />
    </Form>
  );
}
