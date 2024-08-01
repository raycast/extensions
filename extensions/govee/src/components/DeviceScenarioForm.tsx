import { colord } from "colord";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";

import type { DeviceScenario, ScenarioInput } from "@/types";

import useErrorInForm from "@/hooks/useErrorInForm";

import SetColorGrid from "@/components/SetColorGrid";

export type DeviceScenarioFormProps = {
  deviceName: string;
  devScenario: DeviceScenario;
  onSave: (input: ScenarioInput | null) => void;
};

const DeviceScenarioForm = ({ deviceName, devScenario, onSave }: DeviceScenarioFormProps) => {
  const { pop } = useNavigation();

  const [brightnessError, setBrightnessError, dropBrightnessErrorIfNeeded] = useErrorInForm();
  const [colorError, setColorError, dropColorErrorIfNeeded] = useErrorInForm();

  const [color, setColor] = useState<string>(
    devScenario.scenario?.color ? colord(devScenario.scenario.color).toHex() : "",
  );
  useEffect(() => {
    if (devScenario.scenario?.color) {
      setColor(colord(devScenario.scenario.color).toHex());
    }
  }, [devScenario.scenario]);

  const onSubmit = async (input: {
    title: string;
    powerChange: "ignore" | "on" | "off";
    brightness: string;
    color: string;
    devices: string[];
  }) => {
    if (
      input.brightness &&
      (isNaN(parseInt(input.brightness, 10)) ||
        parseInt(input.brightness, 10) < 0 ||
        parseInt(input.brightness, 10) > 100)
    ) {
      setBrightnessError("Please enter a number between 0 and 100");
      return;
    }
    if (input.color && !input.color.match(/^#[0-9a-fA-F]{6}$/)) {
      setColorError("Please enter a valid RGB color (#RRGGBB)");
      return;
    }
    dropBrightnessErrorIfNeeded();
    dropColorErrorIfNeeded();

    const toast = await showToast({ title: "Saving Device Scenario...", style: Toast.Style.Animated });
    const scenario = (devScenario.scenario || {}) as ScenarioInput;

    if (input.powerChange !== "ignore") {
      scenario.onOff = input.powerChange === "on";
    }

    if (input.brightness) {
      scenario.brightness = parseInt(input.brightness, 10);
    }

    if (input.color) {
      scenario.color = colord(input.color).toRgb();
    }

    onSave(Object.keys(scenario).length > 0 ? scenario : null);

    toast.style = Toast.Style.Success;
    toast.title = "Device Scenario saved";
    pop();
  };

  return (
    <Form
      navigationTitle={`Edit Device Scenario - ${deviceName}`}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Main">
            <Action.SubmitForm title="Save" onSubmit={onSubmit} />
            <Action.Push
              title="Choose Color"
              target={
                <SetColorGrid
                  setColor={(input) => {
                    const rgb = colord(input).toHex();
                    setColor(rgb);
                  }}
                />
              }
              icon={Icon.Pencil}
              shortcut={{ key: "b", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Per Device"></ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Specific setting for this device" />
      <Form.Dropdown
        id="powerChange"
        title="Power"
        defaultValue={
          typeof devScenario.scenario?.onOff === "boolean" ? (devScenario.scenario.onOff ? "on" : "off") : "ignore"
        }
        info="This will either switch the device on/off or ignore it"
      >
        <Form.Dropdown.Item value="ignore" title="-" />
        <Form.Dropdown.Item value="on" title="Turn On" />
        <Form.Dropdown.Item value="off" title="Turn Off" />
      </Form.Dropdown>
      <Form.TextField
        id="brightness"
        title="Brightness"
        error={brightnessError}
        defaultValue={devScenario.scenario?.brightness?.toString() || ""}
        placeholder="0-100, leave empty to ignore"
        onChange={dropBrightnessErrorIfNeeded}
        onBlur={(e) => {
          if (!e.target.value) {
            dropBrightnessErrorIfNeeded();
            return;
          }
          const val = parseInt(e.target.value || "100", 10);
          if (Number.isNaN(val) || val < 0 || val > 100) {
            setBrightnessError("Please enter a number between 0 and 100");
          } else {
            dropBrightnessErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="color"
        title="Color"
        error={colorError}
        value={color}
        placeholder="RGB color (#RRGGBB) or leave empty to ignore"
        onChange={(value) => {
          setColor(value);
          dropColorErrorIfNeeded();
        }}
        onBlur={(e) => {
          if (!e.target.value) {
            dropColorErrorIfNeeded();
            return;
          }
          const val = e.target.value;
          if (!val.match(/^#[0-9a-fA-F]{6}$/)) {
            setColorError("Please enter a valid RGB color (#RRGGBB)");
          } else {
            dropColorErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
};

export default DeviceScenarioForm;
