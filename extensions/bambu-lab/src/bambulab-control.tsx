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
import { getTranslations } from "./utils/translations";
import { Preferences, PrinterStatus } from "./utils/types";
import { useMQTT } from "./utils/mqtt";
import { formatTime } from "./utils/format";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [status, setStatus] = useState<PrinterStatus>({});
  const t = getTranslations();

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
        // Ignore JSON parse errors
      }
    },
  });

  const toggleLight = async () => {
    let currentLightState = false;
    if (status.lights_report) {
      if (Array.isArray(status.lights_report)) {
        const cam = status.lights_report.find((l) => l.node === "camera_light");
        currentLightState = cam ? cam.mode === "on" : false;
      } else {
        currentLightState = status.lights_report === "on" || status.lights_report === 1;
      }
    }
    const newState = !currentLightState;
    setStatus((prev) => ({ ...prev, lights_report: newState ? "on" : "off" }));

    try {
      const connected = await waitForConnection();
      if (!connected || !client) return;
      const payload = {
        system: {
          sequence_id: "2000",
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
      // Revert state on error
    }
  };

  const controlPrint = async (action: "pause" | "resume" | "stop") => {
    try {
      const connected = await waitForConnection();
      if (!connected || !client) return;
      client.publish(
        `device/${preferences.serialNumber}/request`,
        JSON.stringify({ print: { sequence_id: "6000", command: action } }),
      );

      showToast({ style: Toast.Style.Success, title: t.toast_command_sent });
    } catch {
      // Ignore errors
    }
  };

  const preheat = async (bedTemp: number, nozzleTemp: number) => {
    try {
      const connected = await waitForConnection();
      if (!connected || !client) return;

      client.publish(
        `device/${preferences.serialNumber}/request`,
        JSON.stringify({ print: { sequence_id: "2002", command: "gcode_line", param: `M140 S${bedTemp}\n` } }),
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      if (client && client.connected) {
        client.publish(
          `device/${preferences.serialNumber}/request`,
          JSON.stringify({ print: { sequence_id: "2003", command: "gcode_line", param: `M104 S${nozzleTemp}\n` } }),
        );
      }

      showToast({ style: Toast.Style.Success, title: t.toast_preheat_started });
    } catch {
      // Ignore errors
    }
  };

  const getAMSMarkdown = () => {
    let md = `## 🎨 ${t.ams_title}\n\n| ${t.ams_header_slot} | ${t.ams_header_material} | ${t.ams_header_color} | ${t.ams_header_remain} |\n| --- | --- | --- | --- |\n`;

    status.ams?.ams[0]?.tray?.forEach((tray, idx) => {
      const hex = tray.tray_color ? tray.tray_color.substring(0, 6) : "888888";
      md += `| A${idx + 1} | ${tray.tray_type || t.ams_status_empty} | #${hex} | ${tray.remain || 0}% |\n`;
    });
    return md;
  };

  const isPrinting = ["RUNNING", "PAUSE", "PREPARE"].includes(status.gcode_state || "");
  const isPaused = status.gcode_state === "PAUSE";

  let isLightOn = false;
  if (status.lights_report) {
    if (Array.isArray(status.lights_report)) {
      isLightOn = status.lights_report.some((l) => l.node === "camera_light" && l.mode === "on");
    } else {
      isLightOn = status.lights_report === "on" || status.lights_report === 1;
    }
  }

  function AMSView() {
    return <Detail markdown={getAMSMarkdown()} navigationTitle={t.ams_view_title} />;
  }

  return (
    <List isLoading={isConnecting}>
      <List.Section title={t.printer_status}>
        <List.Item
          icon={
            isPrinting
              ? { source: Icon.Print, tintColor: Color.Blue }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          title={
            isPrinting ? status.subtask_name?.replace(/\.(gcode\.)?3mf$/i, "") || `${t.printing}...` : t.printer_ready
          }
          subtitle={
            isPrinting
              ? `${t.subtitle_progress} ${status.total_layer_num && status.total_layer_num > 0 ? Math.round(((status.layer_num || 0) / status.total_layer_num) * 100) : 0}%`
              : ""
          }
          accessories={[
            { text: `${status.nozzle_temper || 0}°C`, icon: Icon.Temperature, tooltip: t.tooltip_nozzle },
            { text: `${status.bed_temper || 0}°C`, icon: Icon.Layers, tooltip: t.tooltip_bed },

            ...(isPrinting ? [{ text: `⏳ ${formatTime(status.mc_remaining_time)}`, tooltip: t.tooltip_time }] : []),

            ...(isPrinting
              ? [{ text: `L ${status.layer_num}/${status.total_layer_num}`, tooltip: t.tooltip_layer }]
              : []),

            {
              tag: isPaused
                ? { value: t.tag_pause, color: Color.Yellow }
                : isPrinting
                  ? { value: t.tag_run, color: Color.Green }
                  : { value: t.tag_idle, color: Color.SecondaryText },
            },
          ]}
          actions={
            <ActionPanel>
              {isPrinting && (
                <Action
                  title={isPaused ? t.resume_action : t.pause_print}
                  icon={isPaused ? Icon.Play : Icon.Pause}
                  onAction={() => controlPrint(isPaused ? "resume" : "pause")}
                />
              )}
              {/* AMS button */}
              <Action.Push title={t.action_view_ams} icon={Icon.Circle} target={<AMSView />} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* --- STEERING / PILOTAGE --- */}
      <List.Section title={t.section_steering}>
        {/* PAUSE / RESUME */}
        <List.Item
          icon={
            !isPrinting ? { source: Icon.Pause, tintColor: Color.SecondaryText } : isPaused ? Icon.Play : Icon.Pause
          }
          title={!isPrinting ? t.pause_inactive : isPaused ? t.resume_print : t.pause_print}
          actions={
            <ActionPanel>
              {isPrinting ? (
                <Action
                  title={isPaused ? t.resume_action : t.pause_print}
                  icon={isPaused ? Icon.Play : Icon.Pause}
                  onAction={() => controlPrint(isPaused ? "resume" : "pause")}
                />
              ) : (
                <Action title={t.action_inactive} onAction={() => {}} />
              )}
            </ActionPanel>
          }
        />

        {/* STOP */}
        <List.Item
          icon={{ source: Icon.Stop, tintColor: !isPrinting ? Color.SecondaryText : Color.Red }}
          title={!isPrinting ? t.stop_inactive : t.stop_emergency}
          actions={
            <ActionPanel>
              {isPrinting ? (
                <Action
                  title={t.stop_action}
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: t.alert_stop_short_title,
                        primaryAction: {
                          title: t.alert_stop_btn,
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      await controlPrint("stop");
                    }
                  }}
                />
              ) : (
                <Action title={t.action_inactive} onAction={() => {}} />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      {/* --- TOOLS --- */}
      <List.Section title={t.section_tools}>
        <List.Item
          icon={isLightOn ? { source: Icon.LightBulb, tintColor: Color.Yellow } : Icon.LightBulbOff}
          title={isLightOn ? t.light_off_action : t.light_on_action}
          accessories={[
            {
              tag: isLightOn
                ? { value: t.light_on_status, color: Color.Green }
                : { value: t.light_off_status, color: Color.Red },
            },
          ]}
          actions={
            <ActionPanel>
              <Action title={t.action_toggle} onAction={toggleLight} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Temperature}
          title={t.preheat_title}
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title={t.submenu_material} icon={Icon.Temperature}>
                <Action title={t.action_preheat_pla} onAction={() => preheat(60, 220)} />
                <Action title={t.action_preheat_petg} onAction={() => preheat(80, 250)} />
                <Action title={t.action_cooldown} icon={Icon.Snowflake} onAction={() => preheat(0, 0)} />
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
