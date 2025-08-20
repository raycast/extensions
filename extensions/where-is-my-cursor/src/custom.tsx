import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  PopToRootType,
  environment,
} from "@raycast/api";
import { exec } from "child_process";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");

interface FormValues {
  duration: string;
  screenOpacity: string;
  circleRadius: string;
  circleOpacity: string;
  circleColor: string;
  borderWidth?: string;
  borderColor?: string;
}

function handleSubmit(values: FormValues) {
  const presetConfig = {
    duration: parseFloat(values.duration || "10"),
    screenOpacity: parseFloat(values.screenOpacity || "0.0"),
    circle: {
      radius: parseFloat(values.circleRadius || "50"),
      opacity: parseFloat(values.circleOpacity || "0.4"),
      color: values.circleColor || "yellow",
      border:
        values.borderWidth && values.borderColor
          ? {
              width: parseFloat(values.borderWidth),
              color: values.borderColor,
            }
          : undefined,
    },
  };

  const jsonString = JSON.stringify(presetConfig);
  // Escape double quotes in the JSON string for the shell
  const escapedJsonString = jsonString.replace(/(["])/g, "\\$1");
  const command = `"${helperPath}" -c "${escapedJsonString}"`;

  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to locate cursor",
        message: error.message,
      });
    }
  });
  closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Custom" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="duration"
        title="Duration (seconds)"
        defaultValue="10"
      />
      <Form.TextField
        id="screenOpacity"
        title="Screen Opacity (0-1)"
        defaultValue="0.0"
      />
      <Form.TextField
        id="circleRadius"
        title="Circle Radius"
        defaultValue="50"
      />
      <Form.TextField
        id="circleOpacity"
        title="Circle Opacity (0-1)"
        defaultValue="0.4"
      />
      <Form.TextField
        id="circleColor"
        title="Circle Color"
        defaultValue="yellow"
      />
      <Form.Separator />
      <Form.TextField id="borderWidth" title="Border Width (Optional)" />
      <Form.TextField id="borderColor" title="Border Color (Optional)" />
    </Form>
  );
}
