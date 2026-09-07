import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { crossLaunchCommand } from "raycast-cross-extension";
import { ResultView } from "./components/ResultView";
import { calculateConversion, normalizeHex } from "./lib/color";
import { saveHistory } from "./lib/history";
import { HistoryView } from "./history";

type PickerTarget = "source" | "target";

type ColorPickerLaunchContext = {
  hex?: string;
  formattedColor?: string;
  pickerTarget?: PickerTarget;
};

type ColorConverterProps = {
  initialSource?: string;
  initialTarget?: string;
  pickedColor?: ColorPickerLaunchContext;
};

export function ColorConverter({
  initialSource = "#7A213E",
  initialTarget = "",
  pickedColor,
}: ColorConverterProps) {
  const { push } = useNavigation();
  const pickedHex = pickedColor?.hex ? normalizeHex(pickedColor.hex) : null;
  const pickerTarget = pickedColor?.pickerTarget;
  const resolvedSource =
    pickerTarget === "source" && pickedHex ? pickedHex : initialSource;
  const resolvedTarget =
    pickerTarget === "target" && pickedHex ? pickedHex : initialTarget;
  const [sourceHex, setSourceHex] = useState(resolvedSource);
  const [targetHex, setTargetHex] = useState(resolvedTarget);
  const [sourceError, setSourceError] = useState<string>();
  const [targetError, setTargetError] = useState<string>();

  useEffect(() => {
    if (!pickedHex) {
      return;
    }

    if (pickerTarget === "target") {
      setTargetHex(pickedHex);
      setTargetError(undefined);
      return;
    }

    if (pickerTarget === "source") {
      setSourceHex(pickedHex);
      setSourceError(undefined);
    }
  }, [pickedHex, pickerTarget]);

  async function pickColor(target: PickerTarget) {
    try {
      await crossLaunchCommand(
        {
          name: "pick-color",
          type: LaunchType.UserInitiated,
          extensionName: "color-picker",
          ownerOrAuthorName: "thomas",
          context: { copyToClipboard: false },
        },
        { context: { pickerTarget: target } },
      );
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Color Picker Not Found",
        message: "Install the Raycast Color Picker extension first.",
      });
      await open("raycast://extensions/thomas/color-picker");
    }
  }

  async function handleSubmit() {
    const normalizedSource = normalizeHex(sourceHex);
    const normalizedTarget = normalizeHex(targetHex);
    setSourceError(
      normalizedSource
        ? undefined
        : "Enter a 3- or 6-digit HEX value, such as #7A213E.",
    );
    setTargetError(
      normalizedTarget
        ? undefined
        : "Enter a 3- or 6-digit HEX value, such as #1D262D.",
    );

    if (!normalizedSource || !normalizedTarget) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid HEX Value",
      });
      return;
    }

    const conversion = calculateConversion(normalizedSource, normalizedTarget);
    if (!conversion) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Calculate Colors",
      });
      return;
    }

    try {
      await saveHistory(conversion);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "History not saved",
        message: "The conversion result is still available.",
      });
    }

    push(<ResultView conversion={conversion} />);
  }

  return (
    <Form
      navigationTitle="Convert HEX with Channel Mixer"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Screen Color Picker">
            <Action
              title="Pick Source Color from Screen"
              icon={Icon.EyeDropper}
              onAction={() => pickColor("source")}
            />
            <Action
              title="Pick Target Color from Screen"
              icon={Icon.EyeDropper}
              onAction={() => pickColor("target")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Conversion">
            <Action.SubmitForm
              title="Calculate Channel Mixer"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          <Action.Push
            title="View Conversion History"
            icon={Icon.Clock}
            target={<HistoryView />}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Stable Mode"
        text="Uses shared perceptual-luminance weights to reduce color casts. Constant is added only when more brightness is needed."
      />
      <Form.Description
        title="Quick Color Picking"
        text="Press ⌘K and choose Pick Source Color from Screen or Pick Target Color from Screen. Raycast Color Picker is required."
      />
      <Form.TextField
        id="sourceHex"
        title="Source HEX"
        placeholder="#7A213E"
        value={sourceHex}
        error={sourceError}
        onChange={(value) => {
          setSourceHex(value);
          setSourceError(undefined);
        }}
      />
      <Form.TextField
        id="targetHex"
        title="Target HEX"
        placeholder="#1D262D"
        value={targetHex}
        error={targetError}
        onChange={(value) => {
          setTargetHex(value);
          setTargetError(undefined);
        }}
      />
      <Form.Description
        title="Tip"
        text="Supports #RGB and #RRGGBB. From the result page, copy one output channel or all recommendations at once."
      />
    </Form>
  );
}

export default function Command({
  launchContext = {},
}: LaunchProps<{ launchContext?: ColorPickerLaunchContext }>) {
  return <ColorConverter pickedColor={launchContext} />;
}
