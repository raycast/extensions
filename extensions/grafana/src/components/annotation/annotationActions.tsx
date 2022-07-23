import { ActionPanel, showToast, ToastStyle, PushAction, Color, Icon, popToRoot } from "@raycast/api";
import { getErrorMessage } from "../../utils";
import { annotationDeleteQuery } from "./queries";
import { PatchAnnotationForm } from "./patchAnnotationForm";

export function PatchAnnotationAction(props: { annotation: any }) {
  return (
    <PushAction
      title="Update Annotation"
      target={<PatchAnnotationForm annotation={props.annotation} />}
      icon={{ source: Icon.Text, tintColor: Color.Green }}
    />
  );
}

export function DeleteAnnotationAction(props: { annotation: any }) {
  const annotation = props.annotation;

  const deleteAnnotation = async () => {
    try {
      await annotationDeleteQuery(annotation.id);
      showToast(ToastStyle.Success, "Annotation Deleted", "Annotation deletion successful");
      popToRoot();
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not delete Annotation", getErrorMessage(error));
    }
  };

  return (
    <ActionPanel.Item
      title="Delete Annotation"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={deleteAnnotation}
    />
  );
}
