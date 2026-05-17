import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { sendUtteroCommand, isUtteroRunning } from "./utils/command";

interface Preset {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  isEnabled: boolean;
}

function loadPresets(): { presets: Preset[]; selectedId: string } {
  try {
    const home = process.env.HOME ?? "";
    const plistPath = `${home}/Library/Preferences/com.uttero.app.plist`;

    const presetsJson = execSync(
      `python3 -c "import plistlib; f=open('${plistPath}','rb'); d=plistlib.load(f); v=d.get('presets',b''); print(v.decode('utf-8') if isinstance(v,bytes) else '[]')"`,
      { timeout: 3000 }
    )
      .toString()
      .trim();

    const selectedId = execSync(`defaults read com.uttero.app selectedPresetId 2>/dev/null || echo ""`, {
      timeout: 2000,
    })
      .toString()
      .trim();

    const all: Preset[] = JSON.parse(presetsJson || "[]");
    return { presets: all.filter((p) => p.isEnabled !== false), selectedId };
  } catch {
    return { presets: [], selectedId: "" };
  }
}

export default function DictateWithMode() {
  const { presets, selectedId } = loadPresets();

  async function dictate(preset: Preset) {
    if (!isUtteroRunning()) {
      await showToast({ style: Toast.Style.Failure, title: "Uttero is not running", message: "Start Uttero first." });
      return;
    }
    try {
      sendUtteroCommand("dictate", { styleId: preset.id });
      await closeMainWindow();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to start dictation", message: "Check Uttero is running." });
    }
  }

  if (presets.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="No styles found"
          description="Make sure Uttero is running and has at least one style configured."
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Pick a style and start dictating…">
      {presets.map((preset) => {
        const isActive = preset.id === selectedId;
        return (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={preset.description}
            accessories={
              isActive
                ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Active" }]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action title="Dictate with This Style" icon={Icon.Microphone} onAction={() => dictate(preset)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
