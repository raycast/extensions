import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, WindowManagement } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  calculateCellSize,
  getDesktopContext,
  getUserPreferences,
  getWindowFrames,
  type DesktopContext,
} from "./utils";
import type { Layout } from "./utils/layout/types";
import * as layouts from "./utils/layout";

type NamedLayout = { name: string; icon: string; layout: Layout; slots: number };

const AVAILABLE_LAYOUTS: NamedLayout[] = [
  { icon: "horizontal-50-50.png", name: "Horizontal 50/50", layout: layouts.HORIZONTAL_50_50, slots: 2 },
  { icon: "horizontal-70-30.png", name: "Horizontal 70/30", layout: layouts.HORIZONTAL_70_30, slots: 2 },
  { icon: "horizontal-30-70.png", name: "Horizontal 30/70", layout: layouts.HORIZONTAL_30_70, slots: 2 },
  { icon: "horizontal-75-25.png", name: "Horizontal 75/25", layout: layouts.HORIZONTAL_75_25, slots: 2 },
  { icon: "horizontal-25-75.png", name: "Horizontal 25/75", layout: layouts.HORIZONTAL_25_75, slots: 2 },
  { icon: "horizontal-3.png", name: "Horizontal 3 Columns", layout: layouts.HORIZONTAL_3, slots: 3 },
  { icon: "horizontal-1-2.png", name: "Horizontal 1+2", layout: layouts.HORIZONTAL_1_2, slots: 3 },
  { icon: "horizontal-2-1.png", name: "Horizontal 2+1", layout: layouts.HORIZONTAL_2_1, slots: 3 },
  { icon: "vertical-50-50.png", name: "Vertical 50/50", layout: layouts.VERTICAL_50_50, slots: 2 },
  { icon: "vertical-70-30.png", name: "Vertical 70/30", layout: layouts.VERTICAL_70_30, slots: 2 },
  { icon: "vertical-30-70.png", name: "Vertical 30/70", layout: layouts.VERTICAL_30_70, slots: 2 },
  { icon: "vertical-75-25.png", name: "Vertical 75/25", layout: layouts.VERTICAL_75_25, slots: 2 },
  { icon: "vertical-25-75.png", name: "Vertical 25/75", layout: layouts.VERTICAL_25_75, slots: 2 },
  { icon: "vertical-3.png", name: "Vertical 3 Rows", layout: layouts.VERTICAL_3, slots: 3 },
  { icon: "vertical-1-2.png", name: "Vertical 1+2", layout: layouts.VERTICAL_1_2, slots: 3 },
  { icon: "vertical-2-1.png", name: "Vertical 2+1", layout: layouts.VERTICAL_2_1, slots: 3 },
  { icon: "grid.png", name: "Grid of 4", layout: layouts.GRID, slots: 4 },
  { icon: "grid-6.png", name: "Grid of 6", layout: layouts.GRID_6, slots: 6 },
  { icon: "grid-3x3.png", name: "Grid of 9", layout: layouts.GRID_3X3, slots: 9 },
  { icon: "centered-focus.png", name: "Centered Focus", layout: layouts.CENTERED_FOCUS, slots: 3 },
  { icon: "pip.png", name: "Picture in Picture", layout: layouts.PIP, slots: 2 },
];

export default function Command() {
  const [context, setContext] = useState<DesktopContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWindows, setSelectedWindows] = useState<WindowManagement.Window[]>([]);

  useEffect(() => {
    (async () => {
      const ctx = await getDesktopContext();
      if (ctx) {
        setContext(ctx);
        setSelectedWindows(ctx.windows);
      }
      setIsLoading(false);
    })();
  }, []);

  async function applyWithOrder(namedLayout: NamedLayout) {
    if (!context) return;

    const preferences = getUserPreferences();
    const gap = preferences.gap;
    const { width, height } = context.desktop.size;
    const layout = namedLayout.layout;
    const numberOfRows = layout.length;
    const numberOfColumns = layout[0].length;

    const { cellWidth, cellHeight } = calculateCellSize({
      screenWidth: width,
      screenHeight: height,
      numberOfRows,
      numberOfColumns,
      gap,
    });
    const windowFrames = getWindowFrames({ layout, cellWidth, cellHeight, gap });

    const toast = await showToast({ style: Toast.Style.Animated, title: "Arranging windows..." });

    let failures = 0;
    const entries = Object.entries(windowFrames);
    for (const [windowNumber, frame] of entries) {
      const idx = parseInt(windowNumber, 10) - 1;
      if (idx >= selectedWindows.length) continue;
      try {
        await WindowManagement.setWindowBounds({
          id: selectedWindows[idx].id,
          desktopId: context.desktop.id,
          bounds: {
            position: { x: frame.x, y: frame.y },
            size: { width: frame.width, height: frame.height },
          },
        });
      } catch {
        failures++;
      }
    }

    if (!preferences.keepWindowOpenAfterTiling) {
      await closeMainWindow();
    }

    if (failures > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `${failures} window(s) could not be arranged`;
    } else if (!preferences.disableToasts) {
      toast.style = Toast.Style.Success;
      toast.title = "Windows arranged";
    } else {
      toast.hide();
    }
  }

  function moveWindowUp(index: number) {
    if (index <= 0) return;
    const newOrder = [...selectedWindows];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSelectedWindows(newOrder);
  }

  function moveWindowDown(index: number) {
    if (index >= selectedWindows.length - 1) return;
    const newOrder = [...selectedWindows];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSelectedWindows(newOrder);
  }

  const windowCount = selectedWindows.length;
  const matchingLayouts = AVAILABLE_LAYOUTS.filter((l) => l.slots <= windowCount);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search layouts...">
      <List.Section title={`Windows (${windowCount}) — reorder with ⌥↑/⌥↓`}>
        {selectedWindows.map((w, i) => (
          <List.Item
            key={w.id}
            title={`${i + 1}. ${w.application?.name ?? "Unknown"}`}
            icon={w.application?.path ? { fileIcon: w.application.path } : Icon.Window}
            actions={
              <ActionPanel>
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
                  onAction={() => moveWindowUp(i)}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
                  onAction={() => moveWindowDown(i)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Choose Layout">
        {matchingLayouts.map((nl) => (
          <List.Item
            key={nl.name}
            title={nl.name}
            subtitle={`${nl.slots} slots`}
            icon={{ source: `icons/${nl.icon}` }}
            actions={
              <ActionPanel>
                <Action title="Apply Layout" icon={Icon.Check} onAction={() => applyWithOrder(nl)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
