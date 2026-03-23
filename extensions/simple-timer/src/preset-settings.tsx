import { useState, useEffect } from "react";
import { List, Action, ActionPanel, Icon, Color, Form, useNavigation, showHUD } from "@raycast/api";
import { getPresets, savePresets, parseInput, formatLabel, DEFAULT_PRESETS } from "./utils";

interface Preset { label: string; seconds: number }

function EditPresetView({ index, current, onSave }: {
  index: number;
  current: Preset;
  onSave: (preset: Preset) => void;
}) {
  const { pop } = useNavigation();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit() {
    const parsed = parseInput(input);
    if (!parsed) {
      setError("Invalid time – try '5m', '1h30m', '90s'");
      return;
    }
    onSave({ label: formatLabel(parsed), seconds: parsed });
    showHUD(`✅ Preset ${index + 1} set to ${formatLabel(parsed)}`);
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit Preset ${index + 1}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Current: ${current.label}`} />
      <Form.TextField
        id="time"
        title="New Time"
        placeholder="e.g. 5m · 1h30m · 90s · 25 minutes"
        value={input}
        error={error}
        onChange={(v) => { setInput(v); setError(undefined); }}
      />
    </Form>
  );
}

export function PresetSettings({ onPresetsChanged }: { onPresetsChanged: () => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    getPresets().then(setPresets);
  }, []);

  async function updatePreset(index: number, preset: Preset) {
    const updated = [...presets];
    updated[index] = preset;
    setPresets(updated);
    await savePresets(updated);
    onPresetsChanged();
  }

  async function resetToDefaults() {
    setPresets(DEFAULT_PRESETS);
    await savePresets(DEFAULT_PRESETS);
    onPresetsChanged();
    showHUD("✅ Presets reset to defaults");
  }

  return (
    <List navigationTitle="Preset Settings">
      {presets.map((p, i) => (
        <List.Item
          key={i}
          icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
          title={`Preset ${i + 1}`}
          subtitle={p.label}
          actions={
            <ActionPanel>
              <Action
                title={`Edit Preset ${i + 1}`}
                icon={Icon.Pencil}
                onAction={() => push(
                  <EditPresetView
                    index={i}
                    current={p}
                    onSave={(preset) => updatePreset(i, preset)}
                  />
                )}
              />
              <ActionPanel.Section>
                <Action
                  title="Reset All to Defaults"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  onAction={resetToDefaults}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
