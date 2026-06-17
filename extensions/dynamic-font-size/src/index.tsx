import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";

// Components
import Input from "./components/Input";

// Lib
import generateClamp from "./lib/generateClamp";
import { convertValue } from "./lib/utils";

export default function Command() {
  const [unitType, setUnitType] = useState<TUnit>("px");
  const [minViewportWidth, setMinViewportWidth] = useState("500");
  const [maxViewportWidth, setMaxViewportWidth] = useState("1200");
  const [minFontSize, setMinFontSize] = useState("16");
  const [maxFontSize, setMaxFontSize] = useState("48");
  const [clampValue, setClampValue] = useState("");

  const handleUnitChange = useCallback(
    (value: string) => {
      if (value) {
        const typedValue = value as TUnit;

        setUnitType(typedValue);
        setMinViewportWidth(`${convertValue(minViewportWidth, typedValue)}`);
        setMaxViewportWidth(`${convertValue(maxViewportWidth, typedValue)}`);
        setMinFontSize(`${convertValue(minFontSize, typedValue)}`);
        setMaxFontSize(`${convertValue(maxFontSize, typedValue)}`);
      }
    },
    [minViewportWidth, maxViewportWidth, minFontSize, maxFontSize],
  );

  useMemo(() => {
    const clampFunc = generateClamp({
      minViewportWidth,
      maxViewportWidth,
      minFontSize,
      maxFontSize,
      unit: unitType,
    });

    setClampValue(clampFunc);
  }, [minViewportWidth, maxViewportWidth, minFontSize, maxFontSize, unitType]);

  async function handleSubmit() {
    await Clipboard.copy(clampValue);

    await showToast({
      style: Toast.Style.Success,
      title: "Generated",
      message: "Copied font-size to clipboard",
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Generate" />
        </ActionPanel>
      }
    >
      <Form.Description text="Create dynamic font sizes using the 'clamp' CSS function." />
      <Form.Dropdown id="unit" title="Measurement Unit" value={unitType} onChange={handleUnitChange}>
        <Form.Dropdown.Item value="px" title="Pixels" />
        <Form.Dropdown.Item value="rem" title="REM" />
      </Form.Dropdown>
      <Input
        id="minViewportWidth"
        title="Minimum Viewport Width"
        placeholder="Enter minimum"
        value={minViewportWidth}
        onChange={setMinViewportWidth}
      />
      <Input
        id="maxViewportWidth"
        title="Maximum Viewport Width"
        placeholder="Enter maximum"
        value={maxViewportWidth}
        onChange={setMaxViewportWidth}
      />
      <Input
        id="minFontSize"
        title="Minimum Font Size"
        placeholder="Enter minimum"
        value={minFontSize}
        onChange={setMinFontSize}
      />
      <Input
        id="maxFontSize"
        title="Maximum Font Size"
        placeholder="Enter maximum"
        value={maxFontSize}
        onChange={setMaxFontSize}
      />
    </Form>
  );
}
