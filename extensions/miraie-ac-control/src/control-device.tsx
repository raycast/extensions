import { useEffect, useState } from "react";
import { addHours, addMinutes, format, formatDistance, getUnixTime } from "date-fns";
import { Action, ActionPanel, Icon, showToast, Toast, Color, List } from "@raycast/api";
import { Device, PowerMode, HVACMode, FanMode, PresetMode, SwingMode } from "./lib/miraie";
import { MAX_TEMPERATURE, MIN_TEMPERATURE, SWING_MODE_LABELS } from "./lib/miraie/constants";

interface DeviceDetailProps {
  device: Device;
  onRefresh?: () => void;
}

interface Command {
  id: string;
  title: string;
  icon: Icon;
  action: () => Promise<void> | void;
  successMessage: () => string;
}

interface CommandGroup {
  groupTitle: string;
  commands: Command[];
}

enum TIMER_TYPE {
  ON = "ON",
  OFF = "OFF",
}

export default function ControlDevice({ device, onRefresh }: DeviceDetailProps) {
  const [, forceUpdate] = useState({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const createHvacCommand = (id: string, title: string, icon: Icon, mode: HVACMode) => ({
    id,
    title,
    icon,
    action: () => device.setHvacMode(mode),
    successMessage: () => `Switched to ${title}`,
  });

  const createFanCommand = (id: string, title: string, icon: Icon, mode: FanMode) => ({
    id,
    title,
    icon,
    action: () => device.setFanMode(mode),
    successMessage: () => `Switched to ${title}`,
  });

  const createSwingCommand = (id: string, title: string, icon: Icon, mode: SwingMode, isVertical = false) => ({
    id,
    title,
    icon,
    action: () => (isVertical ? device.setVSwingMode(mode) : device.setHSwingMode(mode)),
    successMessage: () =>
      `${isVertical ? "Vertical" : "Horizontal"} Swing set to ${mode === SwingMode.AUTO ? "Auto" : mode}`,
  });

  const createPresetCommand = (id: string, title: string, icon: Icon, preset: PresetMode) => ({
    id,
    title,
    icon,
    action: () => device.setPresetMode(preset),
    successMessage: () => `Preset set to ${title}`,
  });

  const createTimerCommand = (
    id: string,
    title: string,
    icon: Icon,
    timerValue: number,
    timerType = TIMER_TYPE.OFF,
  ) => {
    if (timerValue === -1) {
      return {
        id,
        title,
        icon,
        action: () => (timerType === TIMER_TYPE.OFF ? device.setOffTimer(timerValue) : device.setOnTimer(timerValue)),
        successMessage: () => "Timer reset",
      };
    }

    const unixTimestamp = getUnixTime(addMinutes(addHours(new Date(), timerValue), 0));
    return {
      id,
      title,
      icon,
      action: () =>
        timerType === TIMER_TYPE.OFF ? device.setOffTimer(unixTimestamp) : device.setOnTimer(unixTimestamp),
      successMessage: () =>
        timerType === TIMER_TYPE.OFF
          ? `AC will be turned off at ${format(new Date(unixTimestamp * 1000), "PPpp")}`
          : `AC will turn on at ${format(new Date(unixTimestamp * 1000), "PPpp")}`,
    };
  };

  const convertSwingToText = (swingMode: SwingMode, isVertical = false): string => {
    const modeMap = isVertical ? SWING_MODE_LABELS.vertical : SWING_MODE_LABELS.horizontal;
    return modeMap[swingMode] || "Unknown";
  };

  const groupedCommands: CommandGroup[] = [
    {
      groupTitle: "General",
      commands: [
        {
          id: "toggle-power",
          title: device.status.powerMode === PowerMode.ON ? "Turn OFF" : "Turn ON",
          icon: Icon.Power,
          action: () => (device.status.powerMode === PowerMode.ON ? device.turnOff() : device.turnOn()),
          successMessage: () => (device.status.powerMode === PowerMode.ON ? "AC turned off" : "AC turned on"),
        },
        {
          id: "increase-temp",
          title: "Increase Temperature",
          icon: Icon.Plus,
          action: () => {
            const nextTemp = Math.min(device.status.temperature + 1, MAX_TEMPERATURE);
            device.setTemperature(nextTemp);
          },
          successMessage: () => `Temperature set to ${Math.min(device.status.temperature + 1, MAX_TEMPERATURE)}°C`,
        },
        {
          id: "decrease-temp",
          title: "Decrease Temperature",
          icon: Icon.Minus,
          action: () => {
            const nextTemp = Math.max(device.status.temperature - 1, MIN_TEMPERATURE);
            device.setTemperature(nextTemp);
          },
          successMessage: () => `Temperature set to ${Math.max(device.status.temperature - 1, MIN_TEMPERATURE)}°C`,
        },
      ],
    },
    {
      groupTitle: "Modes",
      commands: [
        createHvacCommand("auto-mode", "Auto Mode", Icon.RotateClockwise, HVACMode.AUTO),
        createHvacCommand("cool-mode", "Cool Mode", Icon.Snowflake, HVACMode.COOL),
        createHvacCommand("dry-mode", "Dry Mode", Icon.Raindrop, HVACMode.DRY),
        createHvacCommand("fan-mode", "Fan Mode", Icon.Circle, HVACMode.FAN),
        createHvacCommand("heat-mode", "Heat Mode", Icon.Sun, HVACMode.HEAT),
      ],
    },
    {
      groupTitle: "Fan Speed",
      commands: [
        createFanCommand("auto-fan-speed", "Auto Fan Speed", Icon.RotateClockwise, FanMode.AUTO),
        createFanCommand("low-fan-speed", "Low Fan Speed", Icon.StackedBars1, FanMode.LOW),
        createFanCommand("medium-fan-speed", "Medium Fan Speed", Icon.StackedBars2, FanMode.MEDIUM),
        createFanCommand("high-fan-speed", "High Fan Speed", Icon.StackedBars3, FanMode.HIGH),
        createFanCommand("quiet-fan-speed", "Quiet Fan Speed", Icon.SpeakerOff, FanMode.QUIET),
      ],
    },
    {
      groupTitle: "Vertical Swing",
      commands: [
        createSwingCommand("vertical-swing-auto", "Auto Vertical Swing", Icon.ChevronUpDown, SwingMode.AUTO, true),
        createSwingCommand("vertical-swing-1", "Up Vertical Swing", Icon.ArrowUp, SwingMode.ONE, true),
        createSwingCommand("vertical-swing-2", "2 Vertical Swing", Icon.ChevronUpDown, SwingMode.TWO, true),
        createSwingCommand("vertical-swing-3", "3 Vertical Swing", Icon.ChevronUpDown, SwingMode.THREE, true),
        createSwingCommand("vertical-swing-4", "4 Vertical Swing", Icon.ChevronUpDown, SwingMode.FOUR, true),
        createSwingCommand("vertical-swing-5", "Down Vertical Swing", Icon.ArrowDown, SwingMode.FIVE, true),
      ],
    },
    {
      groupTitle: "Horizontal Swing",
      commands: [
        createSwingCommand("horizontal-swing-auto", "Auto Horizontal Swing", Icon.Code, SwingMode.AUTO),
        createSwingCommand("horizontal-swing-1", "Center Horizontal Swing", Icon.Code, SwingMode.ONE),
        createSwingCommand("horizontal-swing-2", "Left Horizontal Swing", Icon.ArrowLeft, SwingMode.TWO),
        createSwingCommand("horizontal-swing-5", "Right Horizontal Swing", Icon.ArrowRight, SwingMode.FIVE),
        createSwingCommand("horizontal-swing-3", "3 Horizontal Swing", Icon.Code, SwingMode.THREE),
        createSwingCommand("horizontal-swing-4", "4 Horizontal Swing", Icon.Code, SwingMode.FOUR),
      ],
    },
    {
      groupTitle: "Presets",
      commands: [
        createPresetCommand("eco-preset", "Eco", Icon.Leaf, PresetMode.ECO),
        createPresetCommand("powerful-preset", "Powerful", Icon.Bolt, PresetMode.BOOST),
        createPresetCommand("clean-preset", "Clean", Icon.Eraser, PresetMode.CLEAN),
        createPresetCommand("none-preset", "None", Icon.RotateAntiClockwise, PresetMode.NONE),
      ],
    },
    {
      groupTitle: "Off Timers",
      commands: [
        createTimerCommand("off-timer-1-hour", "Turn Off in 1 Hour", Icon.Moon, 1),
        createTimerCommand("off-timer-2-hour", "Turn Off in 2 Hour", Icon.Moon, 2),
        createTimerCommand("off-timer-3-hour", "Turn Off in 3 Hour", Icon.Moon, 3),
        createTimerCommand("off-timer-clear", "Clear the Off timer", Icon.Xmark, -1),
      ],
    },
    {
      groupTitle: "On Timers",
      commands: [
        createTimerCommand("on-timer-1-hour", "Turn On in 1 Hour", Icon.Sun, 1, TIMER_TYPE.ON),
        createTimerCommand("on-timer-2-hour", "Turn On in 2 Hour", Icon.Sun, 2, TIMER_TYPE.ON),
        createTimerCommand("on-timer-3-hour", "Turn On in 3 Hour", Icon.Sun, 3, TIMER_TYPE.ON),
        createTimerCommand("on-timer-clear", "Clear the On Timer", Icon.Xmark, -1, TIMER_TYPE.ON),
      ],
    },
  ];

  const commandsMap = new Map<string, Command>(
    groupedCommands.flatMap((group) => group.commands).map((command) => [command.id, command]),
  );

  const getActionsForCommand = (commandId: string) => {
    const cmd = commandsMap.get(commandId);
    if (!cmd) return;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action title={cmd.title} onAction={() => executeAction(cmd.action, cmd.successMessage())} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {onRefresh && (
            <Action
              title="Refresh"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const executeAction = async (action: () => Promise<void> | void, successMessage: string) => {
    if (!device.status.isOnline) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Device Offline",
        message: "Cannot control device. Check WiFi and power connection.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await action();
      await showToast({
        style: Toast.Style.Success,
        title: successMessage,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const powerConsumptionToday = device.powerConsumptionDetails?.getTodayTotal() ?? 0;
  const powerConsumptionWeekly = device.powerConsumptionDetails?.getWeeklyTotal() ?? 0;
  const powerConsumptionMonthly = device.powerConsumptionDetails?.getMonthlyTotal() ?? 0;

  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate({}); // to trigger a re-render so that updated state can be shown on the UI.
    };

    device.registerCallback(handleUpdate);

    return () => {
      device.removeCallback(handleUpdate);
    };
  }, [device]);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search Command...">
      {groupedCommands.map((groupedCommand) => (
        <List.Section key={groupedCommand.groupTitle} title={groupedCommand.groupTitle}>
          {groupedCommand.commands.map((command) => (
            <List.Item
              key={command.id}
              title={command.title}
              icon={command.icon}
              actions={getActionsForCommand(command.id)}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Status">
                        {device.status.isOnline ? (
                          <List.Item.Detail.Metadata.TagList.Item text="online" color={Color.Green} />
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item text="offline" color={Color.Red} />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="Power">
                        {device.status.powerMode === "on" ? (
                          <List.Item.Detail.Metadata.TagList.Item text="on" color={Color.Green} />
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item text="off" color={Color.Red} />
                        )}
                      </List.Item.Detail.Metadata.TagList>

                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Current Settings" />
                      <List.Item.Detail.Metadata.Label title="Temperature" text={`${device.status.temperature}°C`} />
                      <List.Item.Detail.Metadata.Label title="Mode" text={device.status.hvacMode} />
                      <List.Item.Detail.Metadata.Label title="Fan Speed" text={device.status.fanMode} />
                      <List.Item.Detail.Metadata.Label title="Preset" text={device.status.presetMode} />
                      <List.Item.Detail.Metadata.Label
                        title="Vertical Swing"
                        text={convertSwingToText(device.status.vSwingMode, true)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Horizontal Swing"
                        text={convertSwingToText(device.status.hSwingMode)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Room Temperature"
                        text={`${device.status.roomTemperature}°C`}
                      />
                      {device.status.offTimer !== undefined && device.status.offTimer !== -1 && (
                        <List.Item.Detail.Metadata.Label
                          title="Switch Off Time"
                          text={format(new Date(device.status.offTimer * 1000), "PPpp")}
                        />
                      )}
                      {device.status.onTimer !== undefined && device.status.onTimer !== -1 && (
                        <List.Item.Detail.Metadata.Label
                          title="Switch On Time"
                          text={format(new Date(device.status.onTimer * 1000), "PPpp")}
                        />
                      )}
                      {device.status.connectedTime && (
                        <List.Item.Detail.Metadata.Label
                          title="Connected since"
                          text={formatDistance(new Date(device.status.connectedTime), new Date())}
                        />
                      )}

                      {device.powerConsumptionDetails && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Energy Consumption" />
                          <List.Item.Detail.Metadata.Label title="Today" text={`${powerConsumptionToday} kWh`} />
                          <List.Item.Detail.Metadata.Label title="Weekly" text={`${powerConsumptionWeekly} kWh`} />
                          <List.Item.Detail.Metadata.Label title="Monthly" text={`${powerConsumptionMonthly} kWh`} />
                        </>
                      )}

                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Device Info" />
                      <List.Item.Detail.Metadata.Label title="Name" text={device.friendlyName} />
                      <List.Item.Detail.Metadata.Label title="Space" text={device.space.spaceName} />
                      <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
                      {device.details && (
                        <>
                          <List.Item.Detail.Metadata.Label
                            title="Mac Address"
                            text={device.details.macAddress || "N/A"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Firmware Version"
                            text={device.details.firmwareVersion || "N/A"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Model Number"
                            text={device.details.modelNumber || "N/A"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Serial Number"
                            text={device.details.serialNumber || "N/A"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Model"
                            text={device.details.productSerialNumber || "N/A"}
                          />
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
