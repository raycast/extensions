import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
  PushAction,
  Detail,
  Color,
  FormTextField,
  Icon,
  ListItem,
  popToRoot
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";
import { getErrorMessage } from "../../utils";
import { repositoryGetQuery } from "./queries";
import { PipelinesList } from "./pipelinesList";

export function ShowPipelinesActions(props: { repo: any }) {
  return (
    <PushAction
      title="Show pipelines"
      target={<PipelinesList repo={props.repo} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
    />
  );
};

// export function DeleteAnnotationAction(props: { annotation: any }) {
//   const annotation = props.annotation;

//   const deleteAnnotation = async () => {
//     try {
//       await annotationDeleteQuery(annotation.id)
//       showToast(ToastStyle.Success, "Annotation Deleted", "Annotation deletion successful");
//       popToRoot();
//     } catch (error) {
//       showToast(ToastStyle.Failure, "Could not delete Annotation", getErrorMessage(error));
//     }
//   };

//   return (
//     <ActionPanel.Item
//       title="Delete Annotation"
//       icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
//       onAction={deleteAnnotation}
//     />
//   );
// }

