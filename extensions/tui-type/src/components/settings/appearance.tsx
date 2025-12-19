import { Action, ActionPanel, Form, Color, useNavigation } from "@raycast/api";
import { useState } from "react";
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

export function AppearanceSettingsForm({
  renderMode,
  setRenderMode,
  freq,
  setFreq,
  svgSettings,
  setSvgSettings,
  termSettings,
  setTermSettings,
}: {
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  freq: UpdateFreq;
  setFreq: (f: UpdateFreq) => void;
  svgSettings: SvgSettings;
  setSvgSettings: (s: SvgSettings) => void;
  termSettings: TerminalSettings;
  setTermSettings: (s: TerminalSettings) => void;
}) {
  const { pop } = useNavigation();

  const [localMode, setLocalMode] = useState<RenderMode>(renderMode);
  const [localFreq, setLocalFreq] = useState<UpdateFreq>(freq);
  const [localSvg, setLocalSvg] = useState<SvgSettings>(svgSettings);
  const [localTerm, setLocalTerm] = useState<TerminalSettings>(termSettings);

  const handleSvgChange = (key: keyof SvgSettings, value: string) => {
    const newSettings = { ...localSvg, [key]: value };
    setLocalSvg(newSettings);
    setSvgSettings(newSettings);
  };

  const handleTermChange = (key: keyof TerminalSettings, value: string) => {
    const newSettings = { ...localTerm, [key]: value };
    setLocalTerm(newSettings);
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
        value={localMode}
        onChange={(val) => {
          const m = val as RenderMode;
          setLocalMode(m);
          setRenderMode(m);
        }}
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
        value={localFreq}
        onChange={(val) => {
          const f = val as UpdateFreq;
          setLocalFreq(f);
          setFreq(f);
        }}
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

      {localMode === "svg" ? (
        <>
          <Form.Description text="SVG Appearance" />
          {SVG_SETTINGS_CONFIG.map((setting) => (
            <Form.Dropdown
              key={setting.key}
              id={setting.key}
              title={setting.title}
              value={localSvg[setting.key]}
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
              value={localTerm[setting.key]}
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
