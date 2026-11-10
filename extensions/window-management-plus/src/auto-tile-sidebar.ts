import { rows, sidebar } from "./lib/layouts";
import { openPanel, prefs, tile } from "./lib/raycast";

const SIDEBAR_WIDTH = 200; // asked for, then the app clamps to its real minimum

export default async () => {
  const { gap, sidebar: choice } = prefs();
  // Raycast Notes or AI Chat is opened if needed. Otherwise the sidebar is whichever window is active.
  const panel = choice === "active" ? undefined : await openPanel(choice);
  return tile(
    sidebar((i) => (panel ? i.title === panel : !!i.active), SIDEBAR_WIDTH, rows(2, gap), gap),
    panel,
  );
};
