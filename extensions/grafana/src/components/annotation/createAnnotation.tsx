import { ActionPanel, showToast, ToastStyle, FormTextArea, Form, SubmitFormAction, popToRoot } from "@raycast/api";
import { getErrorMessage } from "../../utils";
import { annotationCreationQuery } from "./queries";

interface Values {
  text: string;
  time?: number;
  timeEnd?: number;
  tags?: string;
  dashboardId?: number;
  panelId?: number;
}

async function handleSubmit(values: Values) {
  try {
    if (!values.text.length) throw Error("Please enter a text");
    if (values.text.length > 100) throw Error("Annotation text should not be longer than 100 characters");

    const tags = values.tags?.split(",").map((tag) => tag.trim());

    await annotationCreationQuery({
      text: values.text,
      ...(tags ? { tags } : {}),
    });
    await showToast(ToastStyle.Success, "Annotation created", "Annotation creation successful");

    popToRoot();
  } catch (err) {
    await showToast(ToastStyle.Failure, "Error", getErrorMessage(err));
  }
}

export function CreateAnnotationForm() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create Annotation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" placeholder="My Annotation" />
      {/* TODO: incoming feature, choosing the start time / end time of the annotation */}
      {/* <Form.DatePicker id="time" title="Time (optional)" defaultValue={new Date()} /> */}
      <FormTextArea id="tags" title="Tags (optional)" placeholder="tag1,tag2" />
    </Form>
  );
}
