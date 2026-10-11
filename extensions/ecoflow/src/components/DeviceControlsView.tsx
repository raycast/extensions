import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  type Image,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { getDeviceCategory } from "../devices/catalog";
import { formatCommandValue, getDeviceCommands, isDisruptiveCommand, validateCommandValue } from "../devices/commands";
import { sendDeviceCommand } from "../hooks/useDeviceCommand";
import type { DeviceCommandDefinition, DeviceSnapshot } from "../types/device";

export function DeviceControlsView({
  device,
  onSuccess,
}: {
  device: DeviceSnapshot;
  onSuccess: (() => void) | undefined;
}) {
  const commands = getDeviceCommands(device);
  const category = getDeviceCategory(device.profile.category);
  const sections = groupCommands(commands);

  return (
    <List
      searchBarPlaceholder={`Search controls for ${device.name}...`}
      navigationTitle={`${category.emoji} ${device.name} Controls`}
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.commands.length)}>
          {section.commands.map((command) => (
            <List.Item
              key={command.id}
              icon={controlIcon(command.id)}
              title={command.title}
              subtitle={command.description}
              accessories={controlAccessories(command)}
              actions={
                <ActionPanel>
                  {command.kind === "toggle" ? (
                    <Action
                      title={command.title}
                      icon={Icon.Power}
                      onAction={() => confirmAndRun(device, command, undefined, onSuccess)}
                    />
                  ) : (
                    <Action.Push
                      title="Configure Control…"
                      icon={Icon.Gear}
                      target={<ControlValueForm device={device} command={command} onSuccess={onSuccess} />}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {commands.length === 0 && (
        <List.EmptyView
          icon={Icon.Lock}
          title="Read-Only Device"
          description={`The dashboard supports ${device.profile.displayName} readings, but no control is enabled without a verified public payload.`}
          actions={
            device.profile.documentationUrl ? (
              <ActionPanel>
                <Action
                  title="Open EcoFlow Documentation"
                  icon={Icon.Book}
                  onAction={() => open(device.profile.documentationUrl ?? "https://developer-eu.ecoflow.com/")}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}

function ControlValueForm({
  device,
  command,
  onSuccess,
}: {
  device: DeviceSnapshot;
  command: DeviceCommandDefinition;
  onSuccess: (() => void) | undefined;
}) {
  const defaultValue = command.options?.[0]?.value ?? command.min ?? 0;
  const [value, setValue] = useState(String(defaultValue));
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();

  async function submit() {
    const numericValue = Number(value);
    try {
      validateCommandValue(command, numericValue);
      setError(undefined);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Invalid value");
      return;
    }

    if (await confirmAndRun(device, command, numericValue, onSuccess)) pop();
  }

  return (
    <Form
      navigationTitle={command.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={command.title} icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Device"
        text={`${getDeviceCategory(device.profile.category).emoji} ${device.name} · ${device.profile.displayName}`}
      />
      <Form.Description title="Control" text={command.description} />
      {command.kind === "select" && command.options ? (
        <Form.Dropdown
          id="value"
          title={command.valueLabel ?? "Value"}
          value={value}
          onChange={setValue}
          {...(error ? { error } : {})}
        >
          {command.options.map((option) => (
            <Form.Dropdown.Item key={option.value} title={option.title} value={String(option.value)} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="value"
          title={command.valueLabel ?? "Value"}
          placeholder={valueRange(command)}
          value={value}
          onChange={setValue}
          {...(error ? { error } : {})}
        />
      )}
    </Form>
  );
}

async function confirmAndRun(
  device: DeviceSnapshot,
  command: DeviceCommandDefinition,
  value: number | undefined,
  onSuccess?: () => void,
): Promise<boolean> {
  try {
    validateCommandValue(command, value);
    command.buildPayload(value, device.quotas);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Control Is Not Ready",
      message: error instanceof Error ? error.message : "The control could not be validated.",
    });
    return false;
  }

  const formattedValue = formatCommandValue(command, value);
  const valueText = formattedValue === undefined ? "" : ` Value: ${formattedValue}.`;
  const confirmed = await confirmAlert({
    title: command.title,
    message: `${command.description} Device: ${device.name}.${valueText}`,
    primaryAction: {
      title: command.title,
      style: isDisruptiveCommand(command, value) ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
    },
  });
  if (!confirmed) return false;

  return sendDeviceCommand(
    {
      serialNumber: device.serialNumber,
      commandId: command.id,
      ...(value !== undefined ? { value } : {}),
    },
    onSuccess,
  );
}

function valueRange(command: DeviceCommandDefinition): string {
  if (command.options) return command.options.map((option) => option.title).join(" / ");
  if (command.min !== undefined && command.max !== undefined) return `${command.min}–${command.max}`;
  return "";
}

function controlIcon(commandId: string): Image.ImageLike {
  if (commandId.endsWith("_on")) return { source: Icon.Power, tintColor: Color.Green };
  if (commandId.endsWith("_off")) return { source: Icon.Power, tintColor: Color.Red };
  if (commandId.includes("power_state")) return Icon.Power;
  if (commandId.includes("fan")) return Icon.Wind;
  if (commandId.includes("light") || commandId.includes("brightness")) return Icon.LightBulb;
  if (commandId.includes("temperature")) return Icon.Temperature;
  if (commandId.includes("charge")) return Icon.BatteryCharging;
  if (commandId.includes("ice")) return Icon.Snowflake;
  if (commandId.includes("buzzer")) return Icon.Speaker;
  if (commandId.includes("mode")) return Icon.Gear;
  return Icon.Switch;
}

function controlAccessories(command: DeviceCommandDefinition): List.Item.Accessory[] {
  if (command.kind === "number") return [{ text: valueRange(command) }];
  if (command.kind === "select") return [{ text: `${command.options?.length ?? 0} options` }];
  return [];
}

function groupCommands(commands: DeviceCommandDefinition[]) {
  const sectionOrder = ["Power", "Battery", "Energy", "Climate", "Ice Maker", "Device"] as const;
  const grouped = new Map<string, DeviceCommandDefinition[]>();

  for (const command of commands) {
    const section = commandSection(command.id);
    grouped.set(section, [...(grouped.get(section) ?? []), command]);
  }

  return sectionOrder.flatMap((title) => {
    const sectionCommands = grouped.get(title);
    return sectionCommands?.length ? [{ title, commands: sectionCommands }] : [];
  });
}

function commandSection(commandId: string): "Power" | "Battery" | "Energy" | "Climate" | "Ice Maker" | "Device" {
  if (commandId.includes("charge_limit") || commandId.includes("discharge_limit")) return "Battery";
  if (commandId.includes("supply_priority") || commandId.includes("custom_load")) return "Energy";
  if (
    commandId.includes("temperature") ||
    commandId.includes("mode") ||
    commandId.includes("fan") ||
    commandId.includes("eco")
  ) {
    return "Climate";
  }
  if (commandId.includes("ice")) return "Ice Maker";
  if (commandId.includes("light") || commandId.includes("brightness") || commandId.includes("buzzer")) return "Device";
  return "Power";
}
