/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types and be fully-type safe
import { ActionPanel, showToast, Toast, Form, SubmitFormAction, popToRoot } from "@raycast/api";
import { getErrorMessage } from "../../utils";

import { annotationPatchQuery } from "./queries";

interface Values {
  text: string;
  time?: number;
  timeEnd?: number;
  tags?: string;
  dashboardId?: number;
  panelId?: number;
}

async function handleSubmit(values: Values, annotationId: number) {
  try {
    if (!values.text.length) {
      throw Error("Please enter a text");
    }
    if (values.text.length > 100) {
      throw Error("Annotation text should not be longer than 100 characters");
    }
    // const tags = values.tags?.split(",").map((tag) => tag.trim());

    await annotationPatchQuery(
      {
        text: values.text,
      },
      annotationId,
    );
    await showToast(Toast.Style.Success, "Annotation updated", "Annotation update successful");

    popToRoot();
  } catch (err) {
    await showToast(Toast.Style.Failure, "Error", getErrorMessage(err));
  }
}

export function PatchAnnotationForm(props: { annotation: any }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Update Annotation"
            onSubmit={(values: any) => handleSubmit(values, props.annotation.id)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" defaultValue={props.annotation.text} />
    </Form>
  );
}
