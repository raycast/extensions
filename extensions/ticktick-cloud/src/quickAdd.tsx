import { closeMainWindow, showToast, Toast, type LaunchProps } from "@raycast/api";

import { bootstrapTickTickCommandRuntime } from "./bootstrap/commandBootstrap";
import type { QuickAddCommandToast } from "./commands/executeQuickAddCommand";
import { executeQuickAddCommandShell } from "./commands/quickAddCommandShell";
import { loadRaycastQuickAddDefaults } from "./platform/RaycastCreationDefaults";
import { raycastTaskDestinationPreferences } from "./platform/RaycastTaskDestinationPreferences";

const TOAST_STYLES: Record<QuickAddCommandToast["style"], Toast.Style> = {
  animated: Toast.Style.Animated,
  success: Toast.Style.Success,
  failure: Toast.Style.Failure,
};

export default async function QuickAddCommand(props: LaunchProps<{ arguments: Arguments.QuickAdd }>): Promise<void> {
  await executeQuickAddCommandShell(
    {
      bootstrap: bootstrapTickTickCommandRuntime,
      ports: {
        preferences: raycastTaskDestinationPreferences,
        loadDefaults: loadRaycastQuickAddDefaults,
        effects: {
          showToast: (toast) =>
            showToast({
              style: TOAST_STYLES[toast.style],
              title: toast.title,
              ...(toast.message === undefined ? {} : { message: toast.message }),
            }),
          closeMainWindow: (options) => closeMainWindow(options),
        },
      },
    },
    {
      text: props.arguments.text,
      fallbackText: props.fallbackText,
      description: props.arguments.description,
    }
  );
}
