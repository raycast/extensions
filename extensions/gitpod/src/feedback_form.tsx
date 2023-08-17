import { ActionPanel, Form, Action, showHUD } from "@raycast/api";
import fetch from "node-fetch";

import View from "./components/View";

function FeedbackForm() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Feedback"
            onSubmit={async (values) => {
              try {
                await fetch(`https://raycast-extension-feedback.vercel.app/api-v1`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...values, tags: values.tags.join(",") }),
                });
              } catch (e) {
                showHUD("Failed to submit form data. Please try again.");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="command" title="Command" defaultValue="Open in Gitpod">
        <Form.Dropdown.Item value="Open in Gitpod" title="Open in Gitpod" />
        <Form.Dropdown.Item value="Open Workspaces" title="Open Workspaces" />
        <Form.Dropdown.Item value="Find Gitpod Templates" title="Find Gitpod Templates" />
        <Form.Dropdown.Item value="New Feature Request" title="New Feature" />
      </Form.Dropdown>
      <Form.TextField title="Title of Issue" id="title" placeholder="Any issue you've been facing..." />
      <Form.TextArea
        enableMarkdown={true}
        title="Description"
        id="comment"
        placeholder={"Issue/Feature in brief (markdown supported)"}
      />
      <Form.Dropdown id="type" title="Type" defaultValue="Issue">
        <Form.Dropdown.Item value="Issue" title="Issue" />
        <Form.Dropdown.Item value="Feature Request" title="Feature Request" />
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" defaultValue={["bug", "github"]}>
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
