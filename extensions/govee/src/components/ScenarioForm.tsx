import type { Device } from "@j3lte/govee-lan-controller";
import { colord } from "colord";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";

import type { DeviceScenario, ScenarioData, ScenariosHook } from "@/types";

import useErrorInForm from "@/hooks/useErrorInForm";

import DeviceScenarioForm from "@/components/DeviceScenarioForm";
import SetColorGrid from "@/components/SetColorGrid";

type ExistingScenarioFormProps = {
  id: string;
};

type NewScenarioFormProps = {
  newScenario: true;
  withDevice?: Device;
};

export type ScenarioFormProps = (ExistingScenarioFormProps | NewScenarioFormProps) & {
  scenariosHook: ScenariosHook;
  availableDeviceNames: Record<string, string>;
};

const ScenarioForm = (props: ScenarioFormProps) => {
  const { pop } = useNavigation();
  const { getScenario, createScenario, updateScenario } = props.scenariosHook;

  const isNew = "newScenario" in props;
  const withDevice = "withDevice" in props ? props.withDevice : null;
  const withId = "id" in props ? props.id : null;

  const [titleError, setTitleError, dropTitleErrorIfNeeded] = useErrorInForm();
  const [brightnessError, setBrightnessError, dropBrightnessErrorIfNeeded] = useErrorInForm();
  const [colorError, setColorError, dropColorErrorIfNeeded] = useErrorInForm();

  const availableDevices = Object.entries(props.availableDeviceNames).map(([id, name]) => ({
    id,
    name,
  }));
  const selectedScenario = isNew ? null : getScenario(withId as string);
  const [selectedDeviceScenarios, setSelectedDeviceScenarios] = useState<DeviceScenario[]>(
    selectedScenario?.devices || (withDevice && withDevice.id ? [{ id: withDevice.id, scenario: null }] : []) || [],
  );

  const [color, setColor] = useState<string>(
    selectedScenario?.all?.color ? colord(selectedScenario.all.color).toHex() : "",
  );
  const [cachedDeviceScenarios, _setCachedDeviceScenarios] = useState<Record<string, DeviceScenario>>(
    selectedDeviceScenarios?.reduce(
      (acc, d) => {
        acc[d.id] = d;
        return acc;
      },
      {} as Record<string, DeviceScenario>,
    ) || {},
  );

  useEffect(() => {
    if (selectedScenario?.all?.color) {
      setColor(colord(selectedScenario.all.color).toHex());
    }
  }, [selectedScenario, isNew, withId]);

  const onSubmit = async (input: {
    title: string;
    powerChange: "ignore" | "on" | "off";
    brightness: string;
    color: string;
    icon: keyof typeof Icon;
    devices: string[];
  }) => {
    if (!input.title.trim()) {
      setTitleError("Please enter a name for the scenario");
      return;
    }
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
    dropTitleErrorIfNeeded();
    dropBrightnessErrorIfNeeded();
    dropColorErrorIfNeeded();

    const toast = await showToast({ title: "Saving scenario...", style: Toast.Style.Animated });
    if (isNew) {
      // create new scenario
      const scenario: ScenarioData = {
        title: input.title,
        icon: input.icon,
        all: null,
        devices: [],
      };
      if (input.powerChange !== "ignore" || input.brightness || input.color) {
        scenario.all = {
          onOff: input.powerChange === "ignore" ? null : input.powerChange === "on",
          brightness: input.brightness ? parseInt(input.brightness, 10) : null,
          color: input.color ? colord(input.color).toRgb() : null,
        };
      }
      scenario.devices.push(
        ...input.devices.map((id) => ({
          id,
          scenario: cachedDeviceScenarios[id]?.scenario || null,
        })),
      );

      createScenario(scenario);
      toast.style = Toast.Style.Success;
      toast.title = "Scenario saved";
      pop();

      return;
    }
    const scenario = selectedScenario as ScenarioData;
    scenario.title = input.title;
    scenario.icon = input.icon;
    if (input.powerChange !== "ignore" || input.brightness || input.color) {
      scenario.all = {
        onOff: input.powerChange === "ignore" ? null : input.powerChange === "on",
        brightness: input.brightness ? parseInt(input.brightness, 10) : null,
        color: input.color ? colord(input.color).toRgb() : null,
      };
    } else {
      scenario.all = null;
    }
    scenario.devices = input.devices.map((id) => ({
      id,
      scenario: cachedDeviceScenarios[id]?.scenario || null,
    }));

    updateScenario(withId as string, scenario);
    toast.style = Toast.Style.Success;
    toast.title = "Scenario saved";
    pop();
  };

  return (
    <Form
      navigationTitle={isNew ? "New Scenario" : "Edit Scenario"}
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
            <Action
              title="Select All Devices"
              onAction={() => {
                setSelectedDeviceScenarios(
                  availableDevices.map((d) => ({ id: d.id, scenario: cachedDeviceScenarios[d.id]?.scenario || null })),
                );
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Per Device">
            {selectedDeviceScenarios.map((devScenario) => {
              const dev = availableDevices.find((d) => d.id === devScenario.id);
              if (!dev) {
                return null;
              }
              return (
                <Action.Push
                  key={dev.id}
                  title={dev.name}
                  target={
                    <DeviceScenarioForm
                      deviceName={dev.name}
                      devScenario={devScenario}
                      onSave={(input) => {
                        _setCachedDeviceScenarios((old) => {
                          old[dev.id] = { id: dev.id, scenario: input };
                          return old;
                        });
                      }}
                    />
                  }
                />
              );
            })}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        error={titleError}
        placeholder="Enter a name for the scenario"
        defaultValue={selectedScenario?.title || ""}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(e) => {
          const title = (e.target.value || "").trim();
          if (!title) {
            setTitleError("Please enter a name for the scenario");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={selectedScenario?.icon || ("Play" as keyof typeof Icon)}>
        {Object.keys(Icon).map((icon) => (
          <Form.Dropdown.Item key={icon} value={icon} title={icon} icon={Icon[icon as keyof typeof Icon]} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text="Settings for all devices" />
      <Form.Dropdown
        id="powerChange"
        title="Power"
        defaultValue={
          typeof selectedScenario?.all?.onOff === "boolean" ? (selectedScenario.all.onOff ? "on" : "off") : "ignore"
        }
        info="This will either switch all devices on/off or ignore it"
      >
        <Form.Dropdown.Item value="ignore" title="-" />
        <Form.Dropdown.Item value="on" title="Turn On" />
        <Form.Dropdown.Item value="off" title="Turn Off" />
      </Form.Dropdown>
      <Form.TextField
        id="brightness"
        title="Brightness"
        error={brightnessError}
        defaultValue={selectedScenario?.all?.brightness?.toString() || ""}
        placeholder="0-100, leave empty to ignore"
        info="This will set the brightness for all devices or ignore it by leaving it empty"
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
        info="You can also choose a color from the color menu (Cmd + B)"
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
      <Form.Separator />
      <Form.TagPicker
        id="devices"
        title="Devices"
        value={selectedDeviceScenarios.map((d) => d.id)}
        info="Select the devices you want to include in this scenario. You can set individual settings for each device (see menu)s"
        onChange={(e) => {
          setSelectedDeviceScenarios((old) => {
            const newDevices = e.map((id) => {
              const existing = old.find((d) => d.id === id);
              return existing || { id, scenario: cachedDeviceScenarios[id]?.scenario || null };
            });
            return newDevices;
          });
        }}
        placeholder="Select devices"
      >
        {availableDevices.map((device) => (
          <Form.TagPicker.Item
            key={device.id}
            value={device.id}
            title={device.name}
            icon={cachedDeviceScenarios[device.id]?.scenario !== null ? Icon.LightBulb : undefined}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
};

export default ScenarioForm;
