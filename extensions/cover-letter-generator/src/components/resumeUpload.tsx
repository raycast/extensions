import { ActionPanel, Form } from "@raycast/api";
import { ResumeUploadAction } from "../actions/ResumeUploadAction";

export default function ResumeUpload() {
  return (
    <Form
      navigationTitle="Upload Resume"
      actions={
        <ActionPanel>
          <ResumeUploadAction />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Resume" allowMultipleSelection={false} info="Please select a PDF file" />
      <Form.TextField id="description" title="Description" placeholder="Enter Description" />
    </Form>
  );
}
