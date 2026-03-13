import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { Task, Comment, updateComment, addComment, uploadFile } from "../api";
import useCachedData from "../hooks/useCachedData";

type TaskCommentFormProps = {
  comment?: Comment;
  task: Task;
};

export default function TaskCommentForm({ comment, task }: TaskCommentFormProps) {
  const { pop } = useNavigation();

  const [data, setData] = useCachedData();

  const { itemProps, handleSubmit } = useForm<{ comment: string; files: string[] }>({
    async onSubmit(values) {
      try {
        if (comment) {
          await showToast({ style: Toast.Style.Animated, title: "Updating comment" });
          await updateComment({ id: comment.id, content: values.comment }, { data, setData });
          await showToast({ style: Toast.Style.Success, title: "Comment updated" });
        } else if (values.files.length > 0) {
          await showToast({ style: Toast.Style.Animated, title: "Uploading file" });
          const file = await uploadFile(values.files[0]);
          await showToast({ style: Toast.Style.Animated, title: "Adding comment" });
          await addComment({ item_id: task.id, content: values.comment, file_attachment: file }, { data, setData });
          await showToast({ style: Toast.Style.Success, title: "Comment added" });
        } else {
          await addComment({ item_id: task.id, content: values.comment }, { data, setData });
          await showToast({ style: Toast.Style.Success, title: "Comment added" });
        }

        pop();
      } catch (error) {
        await showFailureToast(error, { title: comment ? "Unable to update comment" : "Unable to add comment" });
      }
    },
    initialValues: {
      comment: comment ? comment.content : "",
    },
    validation: {
      comment: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={comment ? "Edit Comment" : "Add Comment"}
            onSubmit={handleSubmit}
            icon={comment ? Icon.Pencil : Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.comment} title="Comment" placeholder="This is a dummy comment." />

      {comment ? null : (
        <Form.FilePicker
          {...itemProps.files}
          title="File"
          canChooseDirectories={false}
          allowMultipleSelection={false}
        />
      )}
    </Form>
  );
}
