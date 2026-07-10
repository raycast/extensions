import {
  List,
  ActionPanel,
  Action,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Form,
  Clipboard,
  Color,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getDisplays,
  getActiveWindow,
  resizeActiveWindow,
  getDisplayForWindow,
  getDisplayKey,
  DisplayInfo,
  WindowInfo,
} from "./utils/window-manager";
import { getDefaultFavoriteSize } from "./apply-favorite-size";

const PRESET_SIZES = [
  "2560x1440",
  "1920x1200",
  "1920x1080",
  "1600x900",
  "1440x900",
  "1280x720",
  "960x640",
  "800x600",
  "360x640",
];

export default function Command() {
  const { push, pop } = useNavigation();
  const prefs = getPreferenceValues<any>();
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null);
  const [starredSizes, setStarredSizes] = useState<string[]>([]);
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, { width: number; height: number }>>({});
  const [appSpecificFavorites, setAppSpecificFavorites] = useState<Record<string, { width: number; height: number }>>(
    {},
  );
  const [excludedApps, setExcludedApps] = useState<string[]>([]);
  const [localAutoResize, setLocalAutoResize] = useState<boolean>(true);
  const [localAutoCenter, setLocalAutoCenter] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load displays, active window, and saved data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allDisplays, window] = await Promise.all([
        getDisplays(),
        getActiveWindow().catch(() => null), // Fail silently if no window is focused
      ]);
      setDisplays(allDisplays);
      setActiveWindow(window);

      const [
        storedStarred,
        storedCustom,
        storedFavorites,
        storedExcluded,
        storedAppSpecific,
        storedAutoResize,
        storedAutoCenter,
      ] = await Promise.all([
        LocalStorage.getItem<string>("starred-sizes"),
        LocalStorage.getItem<string>("custom-sizes"),
        LocalStorage.getItem<string>("display-favorites"),
        LocalStorage.getItem<string>("excluded-apps"),
        LocalStorage.getItem<string>("app-specific-favorites"),
        LocalStorage.getItem<boolean>("local-enable-auto-resize"),
        LocalStorage.getItem<boolean>("local-enable-auto-center"),
      ]);

      // Initialize defaults if empty
      setStarredSizes(storedStarred ? JSON.parse(storedStarred) : ["1238x988"]);
      setCustomSizes(storedCustom ? JSON.parse(storedCustom) : ["1238x988"]);
      setFavorites(storedFavorites ? JSON.parse(storedFavorites) : {});
      setExcludedApps(storedExcluded ? JSON.parse(storedExcluded) : []);
      setAppSpecificFavorites(storedAppSpecific ? JSON.parse(storedAppSpecific) : {});
      setLocalAutoResize(storedAutoResize !== undefined ? storedAutoResize : prefs.enableAutoResize !== false);
      setLocalAutoCenter(storedAutoCenter !== undefined ? storedAutoCenter : prefs.enableAutoCenter !== false);
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load system data",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResize = async (sizeStr: string) => {
    const parts = sizeStr.split("x");
    if (parts.length !== 2) return;
    const w = parseInt(parts[0]);
    const h = parseInt(parts[1]);
    if (isNaN(w) || isNaN(h)) return;

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Resizing window...",
      });

      const currentWindow = activeWindow || (await getActiveWindow());
      const targetDisplay = getDisplayForWindow(currentWindow, displays);

      // Save previous bounds for restore
      const prevWindowBounds = {
        x: currentWindow.x,
        y: currentWindow.y,
        width: currentWindow.width,
        height: currentWindow.height,
      };
      await LocalStorage.setItem("previous-window-bounds", JSON.stringify(prevWindowBounds));

      // Centered position
      const newX = targetDisplay.visibleX + Math.round((targetDisplay.visibleWidth - w) / 2);
      const newY = targetDisplay.visibleY + Math.round((targetDisplay.visibleHeight - h) / 2);

      await resizeActiveWindow(newX, newY, w, h);

      toast.style = Toast.Style.Success;
      toast.title = `Resized to ${w}×${h}`;
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Resize failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleMaximize = async () => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Maximizing window...",
      });

      const currentWindow = activeWindow || (await getActiveWindow());
      const targetDisplay = getDisplayForWindow(currentWindow, displays);

      // Save previous bounds
      const prevWindowBounds = {
        x: currentWindow.x,
        y: currentWindow.y,
        width: currentWindow.width,
        height: currentWindow.height,
      };
      await LocalStorage.setItem("previous-window-bounds", JSON.stringify(prevWindowBounds));

      await resizeActiveWindow(
        targetDisplay.visibleX,
        targetDisplay.visibleY,
        targetDisplay.visibleWidth,
        targetDisplay.visibleHeight,
      );

      toast.style = Toast.Style.Success;
      toast.title = "Window Maximized";
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to maximize window",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleRestore = async () => {
    try {
      const rawBounds = await LocalStorage.getItem<string>("previous-window-bounds");
      if (!rawBounds) {
        showToast({
          style: Toast.Style.Failure,
          title: "No previous size found",
          message: "Please resize a window first using this extension.",
        });
        return;
      }

      const bounds = JSON.parse(rawBounds);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Restoring window size...",
      });

      await resizeActiveWindow(bounds.x, bounds.y, bounds.width, bounds.height);

      toast.style = Toast.Style.Success;
      toast.title = `Restored to ${bounds.width}×${bounds.height}`;
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to restore window size",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleGetCurrentSize = async () => {
    try {
      const currentWindow = await getActiveWindow();
      setActiveWindow(currentWindow);

      push(
        <CaptureCurrentSizeView
          capturedSize={{ width: currentWindow.width, height: currentWindow.height }}
          displays={displays}
          activeAppName={currentWindow.appName || ""}
          favorites={favorites}
          onSaveFavorite={saveFavorite}
          onSaveAppSpecific={saveAppSpecificFavorite}
          onAddCustomSize={addCustomSize}
          onToggleStar={toggleStar}
          starredSizes={starredSizes}
        />,
      );
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get active window size",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleStar = async (sizeStr: string) => {
    let updated: string[];
    if (starredSizes.includes(sizeStr)) {
      updated = starredSizes.filter((s) => s !== sizeStr);
    } else {
      updated = [...starredSizes, sizeStr];
    }
    setStarredSizes(updated);
    await LocalStorage.setItem("starred-sizes", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: starredSizes.includes(sizeStr) ? "Removed from Starred" : "Added to Starred",
    });
  };

  const deleteCustomSize = async (sizeStr: string) => {
    const updated = customSizes.filter((s) => s !== sizeStr);
    setCustomSizes(updated);
    await LocalStorage.setItem("custom-sizes", JSON.stringify(updated));
    // Also remove from starred if present
    if (starredSizes.includes(sizeStr)) {
      const updatedStarred = starredSizes.filter((s) => s !== sizeStr);
      setStarredSizes(updatedStarred);
      await LocalStorage.setItem("starred-sizes", JSON.stringify(updatedStarred));
    }
    showToast({
      style: Toast.Style.Success,
      title: "Deleted custom size",
    });
  };

  const addCustomSize = async (sizeStr: string) => {
    if (!/^\d+x\d+$/.test(sizeStr)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid size format",
        message: "Format must be WidthxHeight (e.g. 1920x1080)",
      });
      return;
    }
    if (customSizes.includes(sizeStr)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Size already exists",
      });
      return;
    }
    const updated = [sizeStr, ...customSizes];
    setCustomSizes(updated);
    await LocalStorage.setItem("custom-sizes", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: "Added custom size",
    });
  };

  const saveFavorite = async (displayKey: string, width: number, height: number) => {
    const updated = {
      ...favorites,
      [displayKey]: { width, height },
    };
    setFavorites(updated);
    await LocalStorage.setItem("display-favorites", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: `Saved favorite size for display`,
    });
    loadData();
  };

  const removeFavorite = async (displayKey: string) => {
    const updated = { ...favorites };
    delete updated[displayKey];
    setFavorites(updated);
    await LocalStorage.setItem("display-favorites", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: "Removed monitor favorite size",
    });
    loadData();
  };

  const addExcludedApp = async (appName: string) => {
    if (excludedApps.includes(appName)) {
      showToast({ style: Toast.Style.Failure, title: "Application already excluded" });
      return;
    }
    const updated = [...excludedApps, appName];
    setExcludedApps(updated);
    await LocalStorage.setItem("excluded-apps", JSON.stringify(updated));
    showToast({ style: Toast.Style.Success, title: `Excluded ${appName}` });
  };

  const removeExcludedApp = async (appName: string) => {
    const updated = excludedApps.filter((a) => a !== appName);
    setExcludedApps(updated);
    await LocalStorage.setItem("excluded-apps", JSON.stringify(updated));
    showToast({ style: Toast.Style.Success, title: `Removed exclusion for ${appName}` });
  };

  const saveAppSpecificFavorite = async (appName: string, displayKey: string, width: number, height: number) => {
    const key = `${appName.toLowerCase()}_${displayKey}`;
    const updated = {
      ...appSpecificFavorites,
      [key]: { width, height },
    };
    setAppSpecificFavorites(updated);
    await LocalStorage.setItem("app-specific-favorites", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: `Saved app-specific favorite for ${appName}`,
    });
    loadData();
  };

  const removeAppSpecificFavorite = async (key: string) => {
    const updated = { ...appSpecificFavorites };
    delete updated[key];
    setAppSpecificFavorites(updated);
    await LocalStorage.setItem("app-specific-favorites", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: "Removed app-specific favorite size",
    });
    loadData();
  };

  const toggleLocalAutoResize = async () => {
    const newVal = !localAutoResize;
    setLocalAutoResize(newVal);
    await LocalStorage.setItem("local-enable-auto-resize", newVal);
    showToast({
      style: Toast.Style.Success,
      title: `Auto-Resize ${newVal ? "Enabled" : "Disabled"}`,
    });
  };

  const toggleLocalAutoCenter = async () => {
    const newVal = !localAutoCenter;
    setLocalAutoCenter(newVal);
    await LocalStorage.setItem("local-enable-auto-center", newVal);
    showToast({
      style: Toast.Style.Success,
      title: `Auto-Center ${newVal ? "Enabled" : "Disabled"}`,
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for sizes and commands...">
      {/* 1. Displays & Favorites Section */}
      <List.Section title="Displays & Favorite Sizes">
        {displays.map((display) => {
          const key = getDisplayKey(display);
          const fav = favorites[key] || getDefaultFavoriteSize(display, prefs);
          const favStr = `${fav.width}x${fav.height}`;
          const isCurrent = activeWindow && getDisplayForWindow(activeWindow, displays).index === display.index;

          return (
            <List.Item
              key={display.index}
              title={display.name}
              subtitle={`${display.width}×${display.height}${display.isPrimary ? " (Primary)" : ""}`}
              icon={isCurrent ? { source: Icon.Monitor, color: Color.Green } : Icon.Monitor}
              accessories={[{ text: `Favorite: ${favStr}`, icon: Icon.Star }]}
              actions={
                <ActionPanel>
                  <Action title={`Apply Favorite Size (${favStr})`} onAction={() => handleResize(favStr)} />
                  <Action
                    title="Edit Favorite Size"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <EditFavoriteForm
                          display={display}
                          currentFav={fav}
                          onSave={(w, h) => {
                            saveFavorite(key, w, h);
                            pop();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Set Current Window Size as Favorite"
                    icon={Icon.BlankDocumentWithValue}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "f" },
                      windows: { modifiers: ["ctrl", "shift"], key: "f" },
                    }}
                    onAction={async () => {
                      try {
                        const win = await getActiveWindow();
                        await saveFavorite(key, win.width, win.height);
                      } catch (err: unknown) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to get active window size",
                          message: err instanceof Error ? err.message : String(err),
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {/* 2. Starred Sizes */}
      <List.Section title="Starred Sizes">
        {starredSizes.map((size) => (
          <List.Item
            key={`starred-${size}`}
            title={size.replace("x", "×")}
            icon={Icon.Window}
            actions={
              <ActionPanel>
                <SizeActions
                  size={size}
                  isStarred={true}
                  isCustom={customSizes.includes(size)}
                  onResize={handleResize}
                  onToggleStar={toggleStar}
                  onDeleteCustom={deleteCustomSize}
                  activeWindow={activeWindow}
                  displays={displays}
                  push={push}
                  pop={pop}
                  onSaveAppSpecific={saveAppSpecificFavorite}
                  onExcludeApp={addExcludedApp}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* 3. Custom Sizes */}
      <List.Section title="Custom Sizes">
        {customSizes
          .filter((s) => !starredSizes.includes(s))
          .map((size) => (
            <List.Item
              key={`custom-${size}`}
              title={size.replace("x", "×")}
              icon={Icon.Window}
              actions={
                <ActionPanel>
                  <SizeActions
                    size={size}
                    isStarred={false}
                    isCustom={true}
                    onResize={handleResize}
                    onToggleStar={toggleStar}
                    onDeleteCustom={deleteCustomSize}
                    activeWindow={activeWindow}
                    displays={displays}
                    push={push}
                    pop={pop}
                    onSaveAppSpecific={saveAppSpecificFavorite}
                    onExcludeApp={addExcludedApp}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      {/* 4. Preset Sizes */}
      <List.Section title="Preset Sizes">
        {PRESET_SIZES.filter((s) => !starredSizes.includes(s) && !customSizes.includes(s)).map((size) => (
          <List.Item
            key={`preset-${size}`}
            title={size.replace("x", "×")}
            icon={Icon.Window}
            actions={
              <ActionPanel>
                <SizeActions
                  size={size}
                  isStarred={false}
                  isCustom={false}
                  onResize={handleResize}
                  onToggleStar={toggleStar}
                  activeWindow={activeWindow}
                  displays={displays}
                  push={push}
                  pop={pop}
                  onSaveAppSpecific={saveAppSpecificFavorite}
                  onExcludeApp={addExcludedApp}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* 5. Options Section */}
      <List.Section title="Options">
        <List.Item
          title="Maximize Window"
          icon={Icon.Maximize}
          actions={
            <ActionPanel>
              <Action title="Maximize" onAction={handleMaximize} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restore Previous Size"
          icon={Icon.ArrowCounterClockwise}
          actions={
            <ActionPanel>
              <Action title="Restore Size" onAction={handleRestore} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Get Current Size"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action title="Get Current Size" onAction={handleGetCurrentSize} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Add Custom Size"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Add Custom Size"
                onAction={() =>
                  push(
                    <AddCustomForm
                      onAdd={(size) => {
                        addCustomSize(size);
                        pop();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage Monitor Favorites"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Manage Monitor Favorites"
                onAction={() =>
                  push(<MonitorManagerList favorites={favorites} onSave={saveFavorite} onRemove={removeFavorite} />)
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage App Specific Favorites"
          icon={Icon.Star}
          actions={
            <ActionPanel>
              <Action
                title="Manage App Specific Favorites"
                onAction={() =>
                  push(
                    <AppSpecificFavoritesList
                      favorites={appSpecificFavorites}
                      onRemove={removeAppSpecificFavorite}
                      onEdit={saveAppSpecificFavorite}
                      displays={displays}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage Excluded Applications"
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Manage Excluded Applications"
                onAction={() =>
                  push(
                    <ExcludedAppsList
                      excludedApps={excludedApps}
                      onAdd={addExcludedApp}
                      onRemove={removeExcludedApp}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Toggle Auto-Resize"
          subtitle={localAutoResize ? "Currently: Enabled" : "Currently: Disabled"}
          icon={localAutoResize ? { source: Icon.CheckCircle, color: Color.Green } : Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Toggle" onAction={toggleLocalAutoResize} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Toggle Auto-Center"
          subtitle={localAutoCenter ? "Currently: Enabled" : "Currently: Disabled"}
          icon={localAutoCenter ? { source: Icon.CheckCircle, color: Color.Green } : Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Toggle" onAction={toggleLocalAutoCenter} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Manage Monitor Favorites List
function MonitorManagerList(props: {
  favorites: Record<string, { width: number; height: number }>;
  onSave: (key: string, width: number, height: number) => void;
  onRemove: (key: string) => void;
}) {
  const { push, pop } = useNavigation();
  const entries = Object.entries(props.favorites);

  return (
    <List searchBarPlaceholder="Search saved monitors...">
      {entries.length === 0 ? (
        <List.EmptyView
          title="No Custom Monitor Sizes"
          description="Go back and edit a monitor's favorite size to save it here."
          icon={Icon.Monitor}
        />
      ) : (
        entries.map(([key, value]) => {
          const name = key.split("_")[0];
          const res = key.split("_")[1] || "";
          return (
            <List.Item
              key={key}
              title={name}
              subtitle={res}
              icon={Icon.Monitor}
              accessories={[{ text: `Favorite: ${value.width}×${value.height}`, icon: Icon.Star }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Favorite Size"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <EditFavoriteFormByName
                          displayName={name}
                          currentFav={value}
                          onSave={(w, h) => {
                            props.onSave(key, w, h);
                            pop();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove Monitor Size"
                    icon={Icon.Trash}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, windows: { modifiers: ["ctrl"], key: "d" } }}
                    onAction={() => props.onRemove(key)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// Edit Display Favorite Form by Display Name/Key
function EditFavoriteFormByName(props: {
  displayName: string;
  currentFav: { width: number; height: number };
  onSave: (width: number, height: number) => void;
}) {
  const [width, setWidth] = useState(String(props.currentFav.width));
  const [height, setHeight] = useState(String(props.currentFav.height));

  const handleSubmit = () => {
    const w = parseInt(width);
    const h = parseInt(height);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Dimensions",
        message: "Width and height must be positive numbers.",
      });
      return;
    }
    props.onSave(w, h);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Favorite Size" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set custom favorite size for screen: ${props.displayName}`} />
      <Form.TextField id="width" title="Width (pixels)" value={width} onChange={setWidth} placeholder="e.g. 1238" />
      <Form.TextField id="height" title="Height (pixels)" value={height} onChange={setHeight} placeholder="e.g. 988" />
    </Form>
  );
}

// Edit Display Favorite Form
function EditFavoriteForm(props: {
  display: DisplayInfo;
  currentFav: { width: number; height: number };
  onSave: (width: number, height: number) => void;
}) {
  const [width, setWidth] = useState(String(props.currentFav.width));
  const [height, setHeight] = useState(String(props.currentFav.height));

  const handleSubmit = () => {
    const w = parseInt(width);
    const h = parseInt(height);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Dimensions",
        message: "Width and height must be positive numbers.",
      });
      return;
    }
    props.onSave(w, h);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Favorite Size" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set custom favorite size for screen: ${props.display.name}`} />
      <Form.TextField id="width" title="Width (pixels)" value={width} onChange={setWidth} placeholder="e.g. 1238" />
      <Form.TextField id="height" title="Height (pixels)" value={height} onChange={setHeight} placeholder="e.g. 988" />
    </Form>
  );
}

// Add Custom Size Form
function AddCustomForm(props: { onAdd: (sizeStr: string) => void }) {
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const handleSubmit = () => {
    const w = parseInt(width);
    const h = parseInt(height);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Dimensions",
        message: "Width and height must be positive numbers.",
      });
      return;
    }
    props.onAdd(`${w}x${h}`);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Custom Size" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new custom size preset" />
      <Form.TextField id="width" title="Width (pixels)" value={width} onChange={setWidth} placeholder="e.g. 1024" />
      <Form.TextField id="height" title="Height (pixels)" value={height} onChange={setHeight} placeholder="e.g. 768" />
    </Form>
  );
}

// Capture Current Size View
function CaptureCurrentSizeView(props: {
  capturedSize: { width: number; height: number };
  displays: DisplayInfo[];
  activeAppName: string;
  favorites: Record<string, { width: number; height: number }>;
  onSaveFavorite: (key: string, width: number, height: number) => void;
  onSaveAppSpecific: (appName: string, displayKey: string, width: number, height: number) => void;
  onAddCustomSize: (size: string) => void;
  onToggleStar: (size: string) => void;
  starredSizes: string[];
}) {
  const { pop } = useNavigation();
  const sizeStr = `${props.capturedSize.width}x${props.capturedSize.height}`;

  const [starSize, setStarSize] = useState(props.starredSizes.includes(sizeStr));
  const [selectedDisplayKey, setSelectedDisplayKey] = useState("");
  const [appName, setAppName] = useState(props.activeAppName);

  const handleSubmit = () => {
    // 1. Add as custom size
    props.onAddCustomSize(sizeStr);

    // 2. Star size if checked
    const currentlyStarred = props.starredSizes.includes(sizeStr);
    if (starSize !== currentlyStarred) {
      props.onToggleStar(sizeStr);
    }

    // 3. Save as favorite
    if (selectedDisplayKey) {
      if (appName.trim()) {
        props.onSaveAppSpecific(
          appName.trim(),
          selectedDisplayKey,
          props.capturedSize.width,
          props.capturedSize.height,
        );
      } else {
        props.onSaveFavorite(selectedDisplayKey, props.capturedSize.width, props.capturedSize.height);
      }
    } else {
      showToast({
        style: Toast.Style.Success,
        title: "Saved custom size preset",
      });
    }
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Captured Active Window Size: ${props.capturedSize.width} × ${props.capturedSize.height}`}
      />

      <Form.Checkbox id="star" label="Add to Starred Sizes" value={starSize} onChange={setStarSize} />

      <Form.Dropdown
        id="display"
        title="Set as Favorite for Display"
        value={selectedDisplayKey}
        onChange={setSelectedDisplayKey}
      >
        <Form.Dropdown.Item value="" title="Do not assign to a display" />
        {props.displays.map((display) => {
          const key = getDisplayKey(display);
          return (
            <Form.Dropdown.Item key={key} value={key} title={`${display.name} (${display.width}x${display.height})`} />
          );
        })}
      </Form.Dropdown>

      {selectedDisplayKey && (
        <Form.TextField
          id="appName"
          title="App Specific (Optional)"
          placeholder="e.g. Spotify (leave empty for global display favorite)"
          value={appName}
          onChange={setAppName}
        />
      )}
    </Form>
  );
}

// Size Actions Component
function SizeActions(props: {
  size: string;
  isStarred: boolean;
  isCustom: boolean;
  onResize: (size: string) => void;
  onToggleStar: (size: string) => void;
  onDeleteCustom?: (size: string) => void;
  activeWindow: WindowInfo | null;
  displays: DisplayInfo[];
  push: (el: JSX.Element) => void;
  pop: () => void;
  onSaveAppSpecific: (appName: string, displayKey: string, width: number, height: number) => void;
  onExcludeApp: (appName: string) => void;
}) {
  return (
    <>
      <Action title={`Resize to ${props.size}`} onAction={() => props.onResize(props.size)} />

      <Action
        title={props.isStarred ? "Unstar Size" : "Star Size"}
        icon={props.isStarred ? Icon.StarDisabled : Icon.Star}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={() => props.onToggleStar(props.size)}
      />

      <Action
        title="Set App-Specific Favorite..."
        icon={Icon.Star}
        onAction={() =>
          props.push(
            <SetAppSpecificFavoriteForm
              sizeStr={props.size}
              displays={props.displays}
              suggestedAppName={props.activeWindow?.appName || ""}
              onSave={(appName, displayKey, w, h) => {
                props.onSaveAppSpecific(appName, displayKey, w, h);
                props.pop();
              }}
            />,
          )
        }
      />

      {props.activeWindow?.appName && (
        <Action
          title={`Exclude ${props.activeWindow.appName} from Auto-Resize`}
          icon={Icon.EyeDisabled}
          onAction={() => props.onExcludeApp(props.activeWindow!.appName)}
        />
      )}

      {props.isCustom && props.onDeleteCustom && (
        <Action
          title="Delete Custom Size"
          icon={Icon.Trash}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, windows: { modifiers: ["ctrl"], key: "d" } }}
          onAction={() => props.onDeleteCustom!(props.size)}
        />
      )}
    </>
  );
}

// Set App-Specific Favorite Form
function SetAppSpecificFavoriteForm(props: {
  sizeStr: string;
  displays: DisplayInfo[];
  suggestedAppName: string;
  onSave: (appName: string, displayKey: string, width: number, height: number) => void;
}) {
  const parts = props.sizeStr.split("x");
  const w = parts[0] ? parseInt(parts[0]) : 1024;
  const h = parts[1] ? parseInt(parts[1]) : 768;

  const [appName, setAppName] = useState(props.suggestedAppName);
  const [selectedDisplayKey, setSelectedDisplayKey] = useState("");

  const handleSubmit = () => {
    if (!appName.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Application Name Required" });
      return;
    }
    if (!selectedDisplayKey) {
      showToast({ style: Toast.Style.Failure, title: "Display Selection Required" });
      return;
    }
    props.onSave(appName.trim(), selectedDisplayKey, w, h);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save App-Specific Favorite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Assign size ${props.sizeStr} to a specific application on a selected display.`} />
      <Form.TextField
        id="appName"
        title="Application Name"
        value={appName}
        onChange={setAppName}
        placeholder="e.g. Spotify"
      />
      <Form.Dropdown id="display" title="Select Display" value={selectedDisplayKey} onChange={setSelectedDisplayKey}>
        <Form.Dropdown.Item value="" title="Select a display..." />
        {props.displays.map((display) => {
          const key = getDisplayKey(display);
          return (
            <Form.Dropdown.Item key={key} value={key} title={`${display.name} (${display.width}x${display.height})`} />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}

// Manage App Specific Favorites List
function AppSpecificFavoritesList(props: {
  favorites: Record<string, { width: number; height: number }>;
  onRemove: (key: string) => void;
  onEdit: (appName: string, displayKey: string, width: number, height: number) => void;
  displays: DisplayInfo[];
}) {
  const { push, pop } = useNavigation();
  const entries = Object.entries(props.favorites);

  return (
    <List searchBarPlaceholder="Search app-specific favorites...">
      {entries.length === 0 ? (
        <List.EmptyView
          title="No App-Specific Favorites"
          description="Go back and assign a size to an app to save it here."
          icon={Icon.Star}
        />
      ) : (
        entries.map(([key, value]) => {
          const firstUnderscore = key.indexOf("_");
          const appName = firstUnderscore > -1 ? key.substring(0, firstUnderscore) : key;
          const displayKey = firstUnderscore > -1 ? key.substring(firstUnderscore + 1) : "";

          const capitalizedApp = appName.charAt(0).toUpperCase() + appName.slice(1);
          const friendlyName = displayKey.split("_")[0] || displayKey;

          return (
            <List.Item
              key={key}
              title={capitalizedApp}
              subtitle={`Display: ${friendlyName}`}
              accessories={[{ text: `Favorite: ${value.width}×${value.height}`, icon: Icon.Star }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit App-Specific Favorite"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <EditAppSpecificFavoriteForm
                          appName={capitalizedApp}
                          displayKey={displayKey}
                          displays={props.displays}
                          currentFav={value}
                          onSave={(newApp, newDisp, w, h) => {
                            props.onRemove(key);
                            props.onEdit(newApp, newDisp, w, h);
                            pop();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove App-Specific Favorite"
                    icon={Icon.Trash}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, windows: { modifiers: ["ctrl"], key: "d" } }}
                    onAction={() => props.onRemove(key)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// Edit App-Specific Favorite Form
function EditAppSpecificFavoriteForm(props: {
  appName: string;
  displayKey: string;
  displays: DisplayInfo[];
  currentFav: { width: number; height: number };
  onSave: (appName: string, displayKey: string, width: number, height: number) => void;
}) {
  const [appName, setAppName] = useState(props.appName);
  const [selectedDisplayKey, setSelectedDisplayKey] = useState(props.displayKey);
  const [width, setWidth] = useState(String(props.currentFav.width));
  const [height, setHeight] = useState(String(props.currentFav.height));

  const handleSubmit = () => {
    const w = parseInt(width);
    const h = parseInt(height);
    if (!appName.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Application Name Required" });
      return;
    }
    if (!selectedDisplayKey) {
      showToast({ style: Toast.Style.Failure, title: "Display Selection Required" });
      return;
    }
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Dimensions" });
      return;
    }
    props.onSave(appName.trim(), selectedDisplayKey, w, h);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save App-Specific Favorite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit app-specific favorite size." />
      <Form.TextField id="appName" title="Application Name" value={appName} onChange={setAppName} />
      <Form.Dropdown id="display" title="Select Display" value={selectedDisplayKey} onChange={setSelectedDisplayKey}>
        {props.displays.map((display) => {
          const key = getDisplayKey(display);
          return (
            <Form.Dropdown.Item key={key} value={key} title={`${display.name} (${display.width}x${display.height})`} />
          );
        })}
      </Form.Dropdown>
      <Form.TextField id="width" title="Width (pixels)" value={width} onChange={setWidth} />
      <Form.TextField id="height" title="Height (pixels)" value={height} onChange={setHeight} />
    </Form>
  );
}

// Manage Excluded Applications List
function ExcludedAppsList(props: {
  excludedApps: string[];
  onAdd: (app: string) => void;
  onRemove: (app: string) => void;
}) {
  const { push, pop } = useNavigation();

  return (
    <List searchBarPlaceholder="Search excluded applications...">
      {props.excludedApps.length === 0 ? (
        <List.EmptyView
          title="No Excluded Applications"
          description="Resizing and centering will be applied to all windows."
          icon={Icon.Eye}
        />
      ) : (
        props.excludedApps.map((app) => (
          <List.Item
            key={app}
            title={app}
            icon={Icon.XMarkCircle}
            actions={
              <ActionPanel>
                <Action
                  title="Remove from Exclusions"
                  icon={Icon.Trash}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, windows: { modifiers: ["ctrl"], key: "d" } }}
                  onAction={() => props.onRemove(app)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
      <List.Section title="Actions">
        <List.Item
          title="Exclude a New Application"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Exclude Application"
                onAction={() =>
                  push(
                    <AddExcludedAppForm
                      onAdd={(app) => {
                        props.onAdd(app);
                        pop();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Add Excluded App Form
function AddExcludedAppForm(props: { onAdd: (appName: string) => void }) {
  const [appName, setAppName] = useState("");

  const handleSubmit = () => {
    if (!appName.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Application Name Required",
      });
      return;
    }
    props.onAdd(appName.trim());
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Exclude Application" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the application process/executable name to exclude (e.g. Spotify, Finder, Slack, Zoom)" />
      <Form.TextField
        id="appName"
        title="Application Name"
        value={appName}
        onChange={setAppName}
        placeholder="e.g. Spotify"
      />
    </Form>
  );
}
