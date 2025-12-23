import { Action, ActionPanel, Form, Color, useNavigation } from "@raycast/api";
import {
  RenderMode,
  UpdateFreq,
  SvgSettings,
  TerminalSettings,
} from "../../types";
import { SVG_SETTINGS_CONFIG } from "../../config/svg-config";
import { TERMINAL_SETTINGS_CONFIG } from "../../config/terminal-config";
import { UPDATE_FREQ_OPTIONS } from "../../config/update-frequency-config";
import { RENDER_MODE_OPTIONS } from "../../config/render-mode-config";
import { useSettingsStore } from "../../hooks/store/settings/useSettings";

export function AppearanceSettingsForm() {
  const {
    renderMode,
    setRenderMode,
    updateFreq,
    setUpdateFreq,
    svgSettings,
    setSvgSettings,
    termSettings,
    setTermSettings,
  } = useSettingsStore();

  const { pop } = useNavigation();

  const handleSvgChange = (key: keyof SvgSettings, value: string) => {
    const newSettings = { ...svgSettings, [key]: value };
    setSvgSettings(newSettings);
  };

  const handleTermChange = (key: keyof TerminalSettings, value: string) => {
    const newSettings = { ...termSettings, [key]: value };
    setTermSettings(newSettings);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Done" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="renderMode"
        title="Render Engine"
        value={renderMode}
        onChange={(val) => setRenderMode(val as RenderMode)}
      >
        {RENDER_MODE_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={option.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="freq"
        title="Update Frequency"
        value={updateFreq}
        onChange={(val) => setUpdateFreq(val as UpdateFreq)}
      >
        {UPDATE_FREQ_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {renderMode === "svg" ? (
        <>
          <Form.Description text="SVG Appearance" />
          {SVG_SETTINGS_CONFIG.map((setting) => (
            <Form.Dropdown
              key={setting.key}
              id={setting.key}
              title={setting.title}
              value={svgSettings[setting.key]}
              onChange={(val) => handleSvgChange(setting.key, val)}
            >
              {setting.options.map((option) => (
                <Form.Dropdown.Item
                  key={option.value}
                  value={option.value}
                  title={option.title}
                  icon={
                    option.icon
                      ? {
                          source: option.icon.source,
                          tintColor:
                            option.value === "transparent"
                              ? Color.PrimaryText
                              : option.icon.tintColor,
                        }
                      : undefined
                  }
                />
              ))}
            </Form.Dropdown>
          ))}
        </>
      ) : (
        <>
          <Form.Description text="Terminal Appearance" />
          {TERMINAL_SETTINGS_CONFIG.map((setting) => (
            <Form.Dropdown
              key={setting.key}
              id={setting.key}
              title={setting.title}
              value={termSettings[setting.key]}
              onChange={(val) => handleTermChange(setting.key, val)}
            >
              {setting.options.map((option) => (
                <Form.Dropdown.Item
                  key={option.value}
                  value={option.value}
                  title={option.title}
                />
              ))}
            </Form.Dropdown>
          ))}
        </>
      )}
    </Form>
  );
}
