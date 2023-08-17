import { ActionPanel, Form, Action, showHUD, showToast, Toast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { useRef } from "react";

import View from "./components/View";

function FeedbackForm() {
  const commandDropdownRef = useRef<Form.Dropdown>(null);
  const issueTitleRef = useRef<Form.TextField>(null);
  const descriptionRef = useRef<Form.TextField>(null);
  const issueTypeRef = useRef<Form.Dropdown>(null);
  const tagsRef = useRef<Form.TagPicker>(null);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Feedback"
            onSubmit={async (values) => {
              try {
                const toast = await showToast({
                  title: "Submitting Form...",
                  style: ToastStyle.Animated,
                });
                const response = await fetch(`https://raycast-extension-feedback.vercel.app/api-v1`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...values, tags: values.tags.join(",") }),
                });

                if (response.status === 200) {
                  toast.title = "Feedback submitted successfully.";
                  toast.style = ToastStyle.Success;
                  issueTitleRef.current?.reset();
                  commandDropdownRef.current?.reset();
                  issueTypeRef.current?.reset();
                  descriptionRef.current?.reset();
                  tagsRef.current?.reset();
                } else {
                  toast.title = "Unable to Submit the Feedback.";
                  toast.style = ToastStyle.Failure;
                }
                setTimeout(() => {
                  toast.hide();
                }, 2000);
              } catch (e) {
                showHUD("Failed to submit form data. Please try again.");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown ref={commandDropdownRef} id="command" title="Command" defaultValue="Open Context in Gitpod">
        <Form.Dropdown.Item value="Open Context in Gitpod" title="Open Context in Gitpod" />
        <Form.Dropdown.Item value="Manage Workspaces" title="Manage Workspaces" />
        <Form.Dropdown.Item value="Menubar Workspaces" title="Menubar Workspaces" />
        <Form.Dropdown.Item value="New Feature Request" title="New Feature" />
      </Form.Dropdown>
      <Form.TextField
        title="Title of Issue"
        id="title"
        placeholder="Any issue you've been facing..."
        ref={issueTitleRef}
      />
      <Form.TextArea
        enableMarkdown={true}
        ref={descriptionRef}
        title="Description"
        id="comment"
        placeholder={"Issue/Feature in brief (markdown supported)"}
      />
      <Form.Dropdown ref={issueTypeRef} id="type" title="Type" defaultValue="Issue">
        <Form.Dropdown.Item value="Issue" title="Issue" />
        <Form.Dropdown.Item value="Feature Request" title="Feature Request" />
      </Form.Dropdown>
      <Form.TagPicker ref={tagsRef} id="tags" title="Tags" defaultValue={["bug", "github"]}>
        <Form.TagPicker.Item value="bug" title="bug" icon="🐞" />
        <Form.TagPicker.Item value="convenience" title="convenience" icon={"🏪"} />
        <Form.TagPicker.Item value="question" title="question" icon="❓" />
        <Form.TagPicker.Item value="documentation" title="documentation" icon="📚" />
        <Form.TagPicker.Item value="enhancement" title="enhancement" icon="📈" />
        <Form.TagPicker.Item value="github" title="github" icon="🎓" />
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
