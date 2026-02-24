import { Form, ActionPanel, Action, showToast, Toast, environment, popToRoot } from "@raycast/api";
import { useExec, useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { join } from "path";
import { confirmAppRestart, isAppRunning } from "./utils/app-utils";

interface ResetFormValues {
  targetApp: string[];
  restartApp: boolean;
}

export default function Command() {
  const [appPath, setAppPath] = useState<string>("");
  const [shouldRestart, setShouldRestart] = useState<boolean>(false);
  const [shouldExecute, setShouldExecute] = useState<boolean>(false);

  const scriptPath = join(environment.assetsPath, "replace_icon.sh");
  const args = shouldRestart ? ["--reset", "-a", appPath, "--restart"] : ["--reset", "-a", appPath];

  const { handleSubmit, itemProps } = useForm<ResetFormValues>({
    initialValues: {
      restartApp: true,
    },
    validation: {
      targetApp: FormValidation.Required,
    },
    onSubmit: handleFormSubmit,
  });

  const { isLoading, error } = useExec(scriptPath, args, {
    execute: shouldExecute && appPath.length > 0,
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset icon",
        message: err.message,
      });
      setShouldExecute(false);
    },
    onData: (output) => {
      showToast({
        style: Toast.Style.Success,
        title: "Icon reset successfully",
        message: output.trim(),
      });
      setShouldExecute(false);
      popToRoot();
    },
    failureToastOptions: {
      title: "Reset operation failed",
    },
  });

  useEffect(() => {
    if (error && shouldExecute) {
      setShouldExecute(false);
    }
  }, [error, shouldExecute]);

  async function handleFormSubmit(values: ResetFormValues) {
    const selectedApp = values.targetApp[0];
    const restart = values.restartApp;

    if (restart && selectedApp.endsWith(".app")) {
      const appRunning = isAppRunning(selectedApp);

      if (appRunning) {
        const confirmed = await confirmAppRestart(selectedApp);
        if (!confirmed) {
          return;
        }
      }
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Resetting icon...",
    });

    setAppPath(selectedApp);
    setShouldRestart(restart);
    setShouldExecute(true);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reset Icon" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Target"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={true}
        info="Select the app, file or folder to reset its icon"
        {...itemProps.targetApp}
      />

      <Form.Checkbox
        title="Restart App"
        label="Restart the app after resetting icon (if running)"
        info="Restart the app to refresh the icon"
        {...itemProps.restartApp}
      />
    </Form>
  );
}
