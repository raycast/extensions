import { execSync } from "child_process";

export interface Preset {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  isEnabled: boolean;
}

export function loadPresets(): { presets: Preset[]; selectedId: string } {
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
