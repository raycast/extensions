import { ActionPanel, Form, Action, showHUD, showToast, Toast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";

import View from "./components/View";

interface FeedbackFormValues {
  command: string;
  title: string;
  comment: string;
  type: string;
  tags: string[];
}

function FeedbackForm() {
  const { handleSubmit, itemProps, reset, setValue } = useForm<FeedbackFormValues>({
    async onSubmit(values) {
      try {
        const toast = await showToast({
          title: "Submitting Form...",
          style: Toast.Style.Animated,
        });
        const response = await fetch(`https://raycast-extension-feedback.vercel.app/api-v1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, tags: values.tags.join(",") }),
        });

        if (response.status === 200) {
          toast.title = "Feedback submitted successfully.";
          toast.style = Toast.Style.Success;

          reset();
          setValue("tags", ["bug", "github"]);
        } else {
          toast.title = "Unable to Submit the Feedback.";
          toast.style = Toast.Style.Failure;
        }
      } catch (e) {
        showHUD("Failed to submit form data. Please try again.");
      }
    },
    validation: {
      title: FormValidation.Required,
      comment: FormValidation.Required,
    },
    initialValues: {
      tags: ["bug", "github"],
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Submit Feedback" icon={Icon.Envelope} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Command" {...itemProps.command}>
        <Form.Dropdown.Item value="Open Context in Gitpod" title="Open Context in Gitpod" />
        <Form.Dropdown.Item value="Manage Workspaces" title="Manage Workspaces" />
        <Form.Dropdown.Item value="Menubar Workspaces" title="Menubar Workspaces" />
        <Form.Dropdown.Item value="New Feature Request" title="New Feature" />
      </Form.Dropdown>
      <Form.TextField title="Title of Issue" placeholder="Any issue you've been facing..." {...itemProps.title} />
      <Form.TextArea
        enableMarkdown={true}
        title="comment"
        placeholder="Issue/Feature in brief (markdown supported)"
        {...itemProps.comment}
      />
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item value="Issue" title="Issue" />
        <Form.Dropdown.Item value="Feature Request" title="Feature Request" />
      </Form.Dropdown>
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        <Form.TagPicker.Item value="bug" title="Bug" icon="🐞" />
        <Form.TagPicker.Item value="convenience" title="Convenience" icon={"🏪"} />
        <Form.TagPicker.Item value="question" title="Question" icon="❓" />
        <Form.TagPicker.Item value="documentation" title="Documentation" icon="📚" />
        <Form.TagPicker.Item value="enhancement" title="Enhancement" icon="📈" />
        <Form.TagPicker.Item value="github" title="GitHub" icon="🎓" />
      </Form.TagPicker>
    </Form>
  );
}

export default function Command() {
  return (
    <View>
      <FeedbackForm />
    </View>
  );
}
