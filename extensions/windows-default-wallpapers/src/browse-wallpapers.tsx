import { ActionPanel, Grid, getPreferenceValues } from "@raycast/api";
import { Wallpapers } from "./types";
import { CopyWallpaperAction, PreviewWallpaperAction, SetWallpaperAction } from "./components/Actions";
import { useCachedState } from "@raycast/utils";

const preferences = getPreferenceValues();
const primaryAction = preferences.primaryAction;

const rootPath = "C:\\Windows\\Web";

const wallpapers: Wallpapers = {
  windows: {
    name: "Windows",
    items: [
      { name: "Light", path: `${rootPath}\\Wallpaper\\Windows\\img0.jpg` },
      { name: "Dark", path: `${rootPath}\\Wallpaper\\Windows\\img19.jpg` },
    ],
  },
  zoomed: {
    name: "Zoomed",
    items: [
      { name: "Windows Zoomed", path: `${rootPath}\\Screen\\img100.jpg` },
      { name: "Captured Motion 3 Zoomed", path: `${rootPath}\\Screen\\img103.jpg` },
      { name: "Flow 1 Zoomed", path: `${rootPath}\\Screen\\img104.jpg` },
    ],
  },
  touchKeyboard: {
    name: "Touch Keyboard",
    items: [
      { name: "1 - Light", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeLight000.jpg` },
      { name: "1 - Dark", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeDark000.jpg` },
      { name: "2 - Light", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeLight001.jpg` },
      { name: "2 - Dark", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeDark001.jpg` },
      { name: "3 - Light", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeLight002.jpg` },
      { name: "3 - Dark", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeDark002.jpg` },
      { name: "4 - Light", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeLight003.jpg` },
      { name: "4 - Dark", path: `${rootPath}\\touchkeyboard\\TouchKeyboardThemeDark003.jpg` },
    ],
  },
  capturedMotion: {
    name: "Captured Motion",
    items: [
      { name: "1", path: `${rootPath}\\Wallpaper\\ThemeB\\img24.jpg` },
      { name: "2", path: `${rootPath}\\Wallpaper\\ThemeB\\img25.jpg` },
      { name: "3", path: `${rootPath}\\Wallpaper\\ThemeB\\img26.jpg` },
      { name: "4", path: `${rootPath}\\Wallpaper\\ThemeB\\img27.jpg` },
    ],
  },
  flow: {
    name: "Flow",
    items: [
      { name: "1", path: `${rootPath}\\Wallpaper\\ThemeD\\img32.jpg` },
      { name: "2", path: `${rootPath}\\Wallpaper\\ThemeD\\img33.jpg` },
      { name: "3", path: `${rootPath}\\Wallpaper\\ThemeD\\img34.jpg` },
      { name: "4", path: `${rootPath}\\Wallpaper\\ThemeD\\img35.jpg` },
    ],
  },
  glow: {
    name: "Glow",
    items: [
      { name: "1", path: `${rootPath}\\Wallpaper\\ThemeA\\img20.jpg` },
      { name: "2", path: `${rootPath}\\Wallpaper\\ThemeA\\img21.jpg` },
      { name: "3", path: `${rootPath}\\Wallpaper\\ThemeA\\img22.jpg` },
      { name: "4", path: `${rootPath}\\Wallpaper\\ThemeA\\img23.jpg` },
    ],
  },
  sunrise: {
    name: "Sunrise",
    items: [
      { name: "1", path: `${rootPath}\\Wallpaper\\ThemeC\\img28.jpg` },
      { name: "2", path: `${rootPath}\\Wallpaper\\ThemeC\\img29.jpg` },
      { name: "3", path: `${rootPath}\\Wallpaper\\ThemeC\\img30.jpg` },
      { name: "4", path: `${rootPath}\\Wallpaper\\ThemeC\\img31.jpg` },
      { name: "1 - Sunset", path: `${rootPath}\\Screen\\img102.jpg` },
    ],
  },
};

export default function Command() {
  const [columns, setColumns] = useCachedState("columns", 3);

  return (
    <Grid
      columns={columns}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Columns"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"2"} />
          <Grid.Dropdown.Item title="Medium" value={"3"} />
          <Grid.Dropdown.Item title="Small" value={"4"} />
        </Grid.Dropdown>
      }
    >
      {Object.entries(wallpapers).map(([, group]) => (
        <Grid.Section key={group.name} title={group.name}>
          {group.items.map((item: { name: string; path: string }) => (
            <Grid.Item
              key={item.name}
              title={item.name}
              subtitle={item.path.split("\\").at(-1)}
              content={{ source: item.path }}
              actions={
                <ActionPanel>
                  {primaryAction === "setWallpaper" ? (
                    <>
                      <SetWallpaperAction itemPath={item.path} />
                      <PreviewWallpaperAction wallpaper={item} />
                      <CopyWallpaperAction itemPath={item.path} />
                    </>
                  ) : primaryAction === "copyWallpaper" ? (
                    <>
                      <CopyWallpaperAction itemPath={item.path} />
                      <PreviewWallpaperAction wallpaper={item} />
                      <SetWallpaperAction
                        itemPath={item.path}
                        shortcut={{
                          macOS: { modifiers: ["shift"], key: "return" },
                          Windows: { modifiers: ["shift"], key: "enter" },
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <PreviewWallpaperAction wallpaper={item} />
                      <SetWallpaperAction itemPath={item.path} />
                      <CopyWallpaperAction itemPath={item.path} />
                    </>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
