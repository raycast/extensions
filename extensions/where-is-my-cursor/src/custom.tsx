import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  PopToRootType,
  environment,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");

interface FormValues {
  duration: string;
  screenOpacity: string;
  circleRadius: string;
  circleOpacity: string;
  circleColor: string;
  circleColorHex: string;
  borderWidth?: string;
  borderColor?: string;
  borderColorHex?: string;
}

const namedColors = [
  { title: "Red", value: "red" },
  { title: "Green", value: "green" },
  { title: "Blue", value: "blue" },
  { title: "White", value: "white" },
  { title: "Black", value: "black" },
  { title: "Yellow", value: "yellow" },
  { title: "Cyan", value: "cyan" },
  { title: "Magenta", value: "magenta" },
  { title: "Orange", value: "orange" },
  { title: "Purple", value: "purple" },
  { title: "Brown", value: "brown" },
  { title: "Clear", value: "clear" },
];

function handleSubmit(values: FormValues) {
  const circleColor = values.circleColorHex || values.circleColor || "yellow";
  const borderColor = values.borderColorHex || values.borderColor;

  const presetConfig = {
    duration: parseFloat(values.duration || "10"),
    screenOpacity: parseFloat(values.screenOpacity || "0.0"),
    circle: {
      radius: parseFloat(values.circleRadius || "50"),
      opacity: parseFloat(values.circleOpacity || "0.4"),
      color: circleColor,
      border:
        values.borderWidth && borderColor
          ? {
              width: parseFloat(values.borderWidth),
              color: borderColor,
            }
          : undefined,
    },
  };

  const jsonString = JSON.stringify(presetConfig);
  const escapedJsonString = jsonString.replace(/(["])/g, "\\$1");
  const command = `"${helperPath}" -c "${escapedJsonString}"`;

  exec(command, (error) => {
    if (error) {
      showFailureToast(error, { title: "Failed to locate cursor" });
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
      <Form.Dropdown
        id="circleColor"
        title="Circle Color"
        defaultValue="yellow"
      >
        {namedColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            title={color.title}
            value={color.value}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="circleColorHex"
        title="Or enter a custom hex color"
        placeholder="#RRGGBB"
      />
      <Form.Separator />
      <Form.TextField id="borderWidth" title="Border Width (Optional)" />
      <Form.Dropdown id="borderColor" title="Border Color (Optional)">
        <Form.Dropdown.Item key="none" title="None" value="" />
        {namedColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            title={color.title}
            value={color.value}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="borderColorHex"
        title="Or enter a custom hex color for border"
        placeholder="#RRGGBB"
      />
    </Form>
  );
}
