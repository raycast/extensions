import { Alert, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";
import { RaylogRepository } from "./storage";
import { showTaskMutationFailureToast } from "./task-actions";
import {
  createTaskFormController,
  type TaskFormController,
} from "./task-form-controller";

export function createDefaultTaskFormController(
  notePath: string,
  dependencies: {
    pop: () => void;
    afterSaveImpl?: () => Promise<void> | void;
  },
): TaskFormController {
  return createTaskFormController({
    repository: new RaylogRepository(notePath),
    pop: dependencies.pop,
    popToRootImpl: popToRoot,
    afterSaveImpl: dependencies.afterSaveImpl,
    showToastImpl: async ({ style, title, message }) =>
      showToast({
        style: style === "success" ? Toast.Style.Success : Toast.Style.Failure,
        title,
        message,
      }),
    confirmAlertImpl: async ({ title, message, primaryAction }) =>
      confirmAlert({
        title,
        message,
        primaryAction: {
          title: primaryAction.title,
          style:
            primaryAction.style === "destructive"
              ? Alert.ActionStyle.Destructive
              : Alert.ActionStyle.Default,
        },
      }),
    showTaskMutationFailureToastImpl: showTaskMutationFailureToast,
  });
}
