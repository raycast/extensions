import React from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  environment,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useGraphData } from "../hooks/useGraphData";
import { useGraphNavigation } from "../hooks/useGraphNavigation";
import { useTheme } from "../hooks/useTheme";
import { CARD_WIDTH, renderGraphToSVG } from "../utils/renderUtils";
import { THEME_INFO, themeFor } from "../lib/themes";
import {
  SHARE_SCALE,
  ShareMode,
  canShareImage,
  shareGraphImage,
} from "../lib/share";
import { GraphProps } from "../types";

type Keys = { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };

/**
 * A shortcut declared for both platforms. Raycast ignores shortcuts with an
 * ambiguous modifier (`cmd`, `ctrl`) on the other platform, so both variants
 * are spelled out. When `windows` is omitted it mirrors `macOS` with ⌘→Ctrl.
 *
 * Some macOS shortcuts cannot map 1:1: Raycast for Windows reserves
 * Ctrl+Shift+arrows (reorder favorites), Ctrl+Shift+↵, Ctrl+Shift+, and
 * Ctrl+Shift+D and silently drops actions that claim them, and punctuation
 * keys depend on the keyboard layout there. Those get an explicit Windows
 * variant using letters or Ctrl+Alt.
 */
function shortcut(macOS: Keys, windows?: Keys): Keyboard.Shortcut {
  const win = windows ?? {
    key: macOS.key,
    modifiers: macOS.modifiers.map((m) => (m === "cmd" ? "ctrl" : m)),
  };
  return { macOS, Windows: win };
}

const SHORTCUTS = {
  moveUp: shortcut(
    { modifiers: ["cmd", "shift"], key: "arrowUp" },
    { modifiers: ["ctrl", "alt"], key: "arrowUp" },
  ),
  moveDown: shortcut(
    { modifiers: ["cmd", "shift"], key: "arrowDown" },
    { modifiers: ["ctrl", "alt"], key: "arrowDown" },
  ),
  moveLeft: shortcut(
    { modifiers: ["cmd", "shift"], key: "arrowLeft" },
    { modifiers: ["ctrl", "alt"], key: "arrowLeft" },
  ),
  moveRight: shortcut(
    { modifiers: ["cmd", "shift"], key: "arrowRight" },
    { modifiers: ["ctrl", "alt"], key: "arrowRight" },
  ),
  resetView: shortcut(
    { modifiers: ["cmd", "shift"], key: "." },
    { modifiers: ["ctrl", "shift"], key: "r" },
  ),
  nextTheme: shortcut(
    { modifiers: ["cmd", "shift"], key: ";" },
    { modifiers: ["ctrl", "shift"], key: "t" },
  ),
  switchTheme: shortcut({ modifiers: ["cmd"], key: "t" }),
  pasteImage: shortcut({ modifiers: ["cmd", "shift"], key: "v" }),
  saveImage: shortcut({ modifiers: ["cmd", "shift"], key: "s" }),
};

const Graph: React.FC<GraphProps> = ({ expression }) => {
  const {
    dataSegments,
    result,
    svgRendered,
    error,
    xMin,
    xMax,
    yMin,
    yMax,
    setXMin,
    setXMax,
    setYMin,
    setYMax,
  } = useGraphData(expression);

  const { zoomIn, zoomOut, moveLeft, moveRight, moveUp, moveDown, resetView } =
    useGraphNavigation(
      xMin,
      xMax,
      yMin,
      yMax,
      setXMin,
      setXMax,
      setYMin,
      setYMax,
    );

  const { theme, setTheme, nextTheme } = useTheme();
  const graphTheme = themeFor(theme, environment.appearance);

  const cycleTheme = () => {
    const next = nextTheme();
    showToast({
      style: Toast.Style.Success,
      title: "Theme Changed",
      message: `Graph theme set to ${THEME_INFO.find((t) => t.id === next)?.title ?? next}.`,
    });
  };

  /** The on-screen card, at export resolution. */
  const shareSvg = () =>
    renderGraphToSVG(
      expression,
      dataSegments,
      [xMin, xMax],
      [yMin, yMax],
      graphTheme,
      { displayWidth: CARD_WIDTH * SHARE_SCALE, title: expression },
    );

  const shareImage = async (mode: ShareMode) => {
    try {
      await shareGraphImage(shareSvg(), mode, expression);
    } catch (error) {
      await showFailureToast(error, { title: "Could not render the image" });
    }
  };

  return (
    <Detail
      markdown={
        error
          ? `## Error\n\n${error}`
          : result !== null
            ? `\\[${expression} = ${result}\\]`
            : svgRendered
              ? `<img src="data:image/svg+xml;base64,${Buffer.from(
                  renderGraphToSVG(
                    expression,
                    dataSegments,
                    [xMin, xMax],
                    [yMin, yMax],
                    graphTheme,
                    { title: expression },
                  ),
                ).toString("base64")}" alt="Graph" />`
              : `$$${expression}$$\n\n`
      }
      actions={
        !error &&
        result === null && (
          <ActionPanel>
            <ActionPanel.Section>
              {/* "In", "Out" and "Up" are part of the verb here, not prepositions, so Title Case keeps them capitalized. */}
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action title="Zoom In" onAction={zoomIn} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action title="Zoom Out" onAction={zoomOut} />
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Move Up"
                onAction={moveUp}
                shortcut={SHORTCUTS.moveUp}
              />
              <Action
                title="Move Down"
                onAction={moveDown}
                shortcut={SHORTCUTS.moveDown}
              />
              <Action
                title="Move Left"
                onAction={moveLeft}
                shortcut={SHORTCUTS.moveLeft}
              />
              <Action
                title="Move Right"
                onAction={moveRight}
                shortcut={SHORTCUTS.moveRight}
              />
              <Action
                title="Reset View"
                onAction={resetView}
                shortcut={SHORTCUTS.resetView}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Share">
              {canShareImage && (
                <>
                  <Action
                    title="Copy Image"
                    icon={Icon.Image}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={() => shareImage("copy")}
                  />
                  <Action
                    title="Paste Image"
                    icon={Icon.Clipboard}
                    shortcut={SHORTCUTS.pasteImage}
                    onAction={() => shareImage("paste")}
                  />
                  <Action
                    title="Save Image to Downloads"
                    icon={Icon.Download}
                    shortcut={SHORTCUTS.saveImage}
                    onAction={() => shareImage("save")}
                  />
                </>
              )}
              <Action.CopyToClipboard
                title="Copy SVG"
                icon={Icon.Code}
                content={shareSvg()}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Theme">
              <Action
                title="Next Theme"
                icon={Icon.Brush}
                onAction={cycleTheme}
                shortcut={SHORTCUTS.nextTheme}
              />
              <ActionPanel.Submenu
                title="Switch Theme"
                icon={Icon.Brush}
                shortcut={SHORTCUTS.switchTheme}
              >
                {THEME_INFO.map((t) => (
                  <Action
                    key={t.id}
                    title={t.title}
                    icon={theme === t.id ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => setTheme(t.id)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
};

export default Graph;
