import { ActionPanel, Action, Grid, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { ThemeColors, Theme } from "./types";
import { generatePreviewSvg } from "./generate-preview-svg";

const THEMES_PATH = "/Applications/Ghostty.app/Contents/Resources/ghostty/themes";
const CONFIG_PATH = join(homedir(), ".config", "ghostty", "config");

function parseThemeFile(content: string): ThemeColors {
  const colors: ThemeColors = {
    background: "#1a1a1a",
    foreground: "#ffffff",
    cursor: "#ffffff",
    palette: Array(16).fill("#888888"),
  };

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^=]+?)\s*=\s*(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    const cleanValue = value.trim();

    switch (key.trim()) {
      case "background":
        colors.background = cleanValue;
        break;
      case "foreground":
        colors.foreground = cleanValue;
        break;
      case "cursor-color":
        colors.cursor = cleanValue;
        break;
      case "palette": {
        const paletteMatch = cleanValue.match(/^(\d+)=(.+)$/);
        if (paletteMatch) {
          const index = parseInt(paletteMatch[1], 10);
          if (index >= 0 && index < 16) {
            colors.palette[index] = paletteMatch[2];
          }
        }
        break;
      }
    }
  }

  return colors;
}

async function loadThemes(): Promise<Theme[]> {
  const files = await readdir(THEMES_PATH);
  const themes: Theme[] = [];

  for (const file of files) {
    try {
      const content = await readFile(join(THEMES_PATH, file), "utf-8");
      const colors = parseThemeFile(content);
      themes.push({ name: file, colors });
    } catch {
      // Skip files that can't be read
    }
  }

  return themes.sort((a, b) => a.name.localeCompare(b.name));
}

async function reloadGhosttyConfig(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = `
tell application "System Events"
  tell process "Ghostty"
    click menu item "Reload Configuration" of menu "Ghostty" of menu bar 1
  end tell
end tell
`;
    exec(`osascript -e '${script}'`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function applyTheme(themeName: string): Promise<void> {
  if (!existsSync(CONFIG_PATH)) {
    await writeFile(CONFIG_PATH, `theme = "${themeName}"\n`);
  } else {
    const content = await readFile(CONFIG_PATH, "utf-8");
    const lines = content.split("\n");
    let themeFound = false;

    const newLines = lines.map((line) => {
      if (line.trim().startsWith("theme")) {
        themeFound = true;
        return `theme = "${themeName}"`;
      }
      return line;
    });

    if (!themeFound) {
      newLines.unshift(`theme = "${themeName}"`);
    }

    await writeFile(CONFIG_PATH, newLines.join("\n"));
  }

  // Reload Ghostty config
  await reloadGhosttyConfig();
}

export default function Command() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadThemes()
      .then(setThemes)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load themes",
          message: String(error),
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredThemes = useMemo(() => {
    if (!searchText) return themes;
    const lower = searchText.toLowerCase();
    return themes.filter((t) => t.name.toLowerCase().includes(lower));
  }, [themes, searchText]);

  const handleApplyTheme = async (theme: Theme) => {
    try {
      await applyTheme(theme.name);
      showToast({
        style: Toast.Style.Success,
        title: "Theme Applied",
        message: `${theme.name} is now active`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply theme",
        message: String(error),
      });
    }
  };

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Zero}
      aspectRatio="3/2"
      isLoading={isLoading}
      searchBarPlaceholder="Search themes..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredThemes.map((theme) => (
        <Grid.Item
          key={theme.name}
          content={{ source: generatePreviewSvg(theme.colors), tintColor: null }}
          title={theme.name}
          subtitle=""
          actions={
            <ActionPanel>
              <Action title="Apply Theme" icon={Icon.CheckCircle} onAction={() => handleApplyTheme(theme)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
