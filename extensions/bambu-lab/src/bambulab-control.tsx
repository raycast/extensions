import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Color,
  Detail,
} from "@raycast/api";
import { useState } from "react";
import { PrinterStatus, LightReport, BambuPreferences } from "./utils/types";
import { useMQTT } from "./utils/mqtt";
import { formatTime } from "./utils/format";
import { SEQUENCE_IDS, FTP_CONFIG } from "./utils/constants";

export default function Command() {
  const preferences = getPreferenceValues<BambuPreferences>();
  const [status, setStatus] = useState<PrinterStatus>({});

  const { client, isConnecting, waitForConnection } = useMQTT(preferences, {
    subscribeToReports: true,
    pushAllOnConnect: true,
    onMessage: (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.print) {
          setStatus((prev) => ({ ...prev, ...data.print }));
        }
      } catch {
        // Silently ignore malformed MQTT messages
      }
    },
  });

  const toggleLight = async () => {
    let currentLightState = false;
    if (status.lights_report) {
      if (Array.isArray(status.lights_report)) {
        const cam = status.lights_report.find((light: LightReport) => light.node === "camera_light");
        currentLightState = cam ? cam.mode === "on" : false;
      } else {
        currentLightState = status.lights_report === "on" || status.lights_report === 1;
      }
    }
    const newState = !currentLightState;
    const previousState = status.lights_report;
    setStatus((prev) => ({ ...prev, lights_report: newState ? "on" : "off" }));

    try {
      const connected = await waitForConnection();
      if (!connected || !client) {
        setStatus((prev) => ({ ...prev, lights_report: previousState }));
        return;
      }
      const payload = {
        system: {
          sequence_id: SEQUENCE_IDS.LIGHT_CONTROL,
          command: "ledctrl",
          led_node: "camera_light",
          led_mode: newState ? "on" : "off",
          led_on_time: 500,
          led_off_time: 500,
          loop_times: 0,
          interval_time: 0,
        },
      };
      client.publish(`device/${preferences.serialNumber}/request`, JSON.stringify(payload));
    } catch {
      setStatus((prev) => ({ ...prev, lights_report: previousState }));
    }
  };

  const controlPrint = async (action: "pause" | "resume" | "stop") => {
    try {
      const connected = await waitForConnection();
      if (!connected || !client) return;
      client.publish(
        `device/${preferences.serialNumber}/request`,
        JSON.stringify({ print: { sequence_id: SEQUENCE_IDS.PRINT_CONTROL, command: action } }),
      );

      showToast({ style: Toast.Style.Success, title: "Command sent" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Error" });
    }
  };

  const preheat = async (bedTemp: number, nozzleTemp: number) => {
    try {
      const connected = await waitForConnection();
      if (!connected || !client) return;

      client.publish(
        `device/${preferences.serialNumber}/request`,
        JSON.stringify({
          print: {
            sequence_id: SEQUENCE_IDS.BED_PREHEAT,
            command: "gcode_line",
            param: `M140 S${bedTemp}\n`,
          },
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, FTP_CONFIG.PREHEAT_DELAY_MS));

      if (client && client.connected) {
        client.publish(
          `device/${preferences.serialNumber}/request`,
          JSON.stringify({
            print: {
              sequence_id: SEQUENCE_IDS.NOZZLE_PREHEAT,
              command: "gcode_line",
              param: `M104 S${nozzleTemp}\n`,
            },
          }),
        );
      }

      showToast({ style: Toast.Style.Success, title: "Preheating started" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Error" });
    }
  };

  const getAMSMarkdown = () => {
    let md = `## AMS Content\n\n| Slot | Material | Color | Remaining |\n| --- | --- | --- | --- |\n`;

    status.ams?.ams[0]?.tray?.forEach((tray, index) => {
      const hex = tray.tray_color ? tray.tray_color.substring(0, 6) : "888888";
      md += `| A${index + 1} | ${tray.tray_type || "Empty"} | #${hex} | ${tray.remain || 0}% |\n`;
    });
    return md;
  };

  const isPrinting = ["RUNNING", "PAUSE", "PREPARE"].includes(status.gcode_state || "");
  const isPaused = status.gcode_state === "PAUSE";

  let isLightOn = false;
  if (status.lights_report) {
    if (Array.isArray(status.lights_report)) {
      isLightOn = status.lights_report.some(
        (light: LightReport) => light.node === "camera_light" && light.mode === "on",
      );
    } else {
      isLightOn = status.lights_report === "on" || status.lights_report === 1;
    }
  }

  function AMSView() {
    return <Detail markdown={getAMSMarkdown()} navigationTitle="AMS Details" />;
  }

  return (
    <List isLoading={isConnecting}>
      <List.Section title="Printer Status">
        <List.Item
          icon={
            isPrinting
              ? { source: Icon.Print, tintColor: Color.Blue }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          title={isPrinting ? status.subtask_name?.replace(/\.(gcode\.)?3mf$/i, "") || "Printing..." : "Printer Ready"}
          subtitle={
            isPrinting
              ? `Progress: ${status.total_layer_num && status.total_layer_num > 0 ? Math.round(((status.layer_num || 0) / status.total_layer_num) * 100) : 0}%`
              : ""
          }
          accessories={[
            { text: `${status.nozzle_temper || 0}°C`, icon: Icon.Temperature, tooltip: "Nozzle" },
            { text: `${status.bed_temper || 0}°C`, icon: Icon.Layers, tooltip: "Bed" },

            ...(isPrinting ? [{ text: `⏳ ${formatTime(status.mc_remaining_time)}`, tooltip: "Time remaining" }] : []),

            ...(isPrinting
              ? [{ text: `L ${status.layer_num}/${status.total_layer_num}`, tooltip: "Current layer" }]
              : []),

            {
              tag: isPaused
                ? { value: "PAUSE", color: Color.Yellow }
                : isPrinting
                  ? { value: "RUN", color: Color.Green }
                  : { value: "IDLE", color: Color.SecondaryText },
            },
          ]}
          actions={
            <ActionPanel>
              {isPrinting && (
                <Action
                  title={isPaused ? "Resume" : "Pause Printing"}
                  icon={isPaused ? Icon.Play : Icon.Pause}
                  onAction={() => controlPrint(isPaused ? "resume" : "pause")}
                />
              )}
              <Action.Push title="View AMS Content" icon={Icon.Circle} target={<AMSView />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Steering">
        <List.Item
          icon={
            !isPrinting ? { source: Icon.Pause, tintColor: Color.SecondaryText } : isPaused ? Icon.Play : Icon.Pause
          }
          title={!isPrinting ? "Pause (Inactive)" : isPaused ? "Resume Printing" : "Pause Printing"}
          actions={
            <ActionPanel>
              {isPrinting ? (
                <Action
                  title={isPaused ? "Resume" : "Pause Printing"}
                  icon={isPaused ? Icon.Play : Icon.Pause}
                  onAction={() => controlPrint(isPaused ? "resume" : "pause")}
                />
              ) : (
                <Action title="Inactive" onAction={() => {}} />
              )}
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.Stop, tintColor: !isPrinting ? Color.SecondaryText : Color.Red }}
          title={!isPrinting ? "Emergency Stop (Inactive)" : "EMERGENCY STOP"}
          actions={
            <ActionPanel>
              {isPrinting ? (
                <Action
                  title="Stop Printing"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Stop?",
                        primaryAction: {
                          title: "Stop",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      await controlPrint("stop");
                    }
                  }}
                />
              ) : (
                <Action title="Inactive" onAction={() => {}} />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Tools">
        <List.Item
          icon={isLightOn ? { source: Icon.LightBulb, tintColor: Color.Yellow } : Icon.LightBulbOff}
          title={isLightOn ? "Turn Light Off" : "Turn Light On"}
          accessories={[
            {
              tag: isLightOn ? { value: "ON", color: Color.Green } : { value: "OFF", color: Color.Red },
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Toggle" onAction={toggleLight} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Temperature}
          title="Preheat"
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="Material" icon={Icon.Temperature}>
                <Action title="PLA (60°C / 220°C)" onAction={() => preheat(60, 220)} />
                <Action title="PETG (80°C / 250°C)" onAction={() => preheat(80, 250)} />
                <Action title="Cooldown (0°C)" icon={Icon.Snowflake} onAction={() => preheat(0, 0)} />
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
