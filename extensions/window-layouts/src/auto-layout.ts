import { showFailureToast } from "@raycast/utils";
import { createLayout, getDesktopContext } from "./utils";
import { GRID, GRID_3X3, GRID_6, HORIZONTAL_1_2, HORIZONTAL_50_50 } from "./utils/layout";
import type { Layout } from "./utils/layout/types";

const AUTO_LAYOUTS: Record<number, Layout> = {
  1: [[1]],
  2: HORIZONTAL_50_50,
  3: HORIZONTAL_1_2,
  4: GRID,
  5: GRID_6,
  6: GRID_6,
  7: GRID_3X3,
  8: GRID_3X3,
  9: GRID_3X3,
};

export default async function Command() {
  try {
    const context = await getDesktopContext();
    if (!context) return;

    const windowCount = context.windows.length;
    const layout = AUTO_LAYOUTS[windowCount] ?? GRID_3X3;

    return createLayout(layout, context);
  } catch (error) {
    console.error("Auto layout error:", error);
    await showFailureToast("Failed to auto-arrange windows", {
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
