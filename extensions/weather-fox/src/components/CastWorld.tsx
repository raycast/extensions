import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { buildCastShareSvg, demoScenes, renderCastScene } from "../lib/cast";
import { ShareMode, shareForecastImage } from "../lib/share";
import { svgToMarkdown } from "../lib/svg";

/** Full-window markdown width, matching the Cast command. */
const SCENE_WIDTH = 660;

/**
 * Cast's World: the full scene catalog, one big animated scene at a time.
 * Reached only through an easter egg in the location search.
 */
export function CastWorld() {
  const scenes = useMemo(() => demoScenes(), []);
  const [index, setIndex] = useState(0);
  const { title, scene } = scenes[index];

  const markdown = useMemo(
    () =>
      `${svgToMarkdown(renderCastScene(scene, SCENE_WIDTH, `w${index}-`), title)}\n\n*${index + 1} of ${scenes.length} — press ↵ for the next scene*`,
    [scene, title, index, scenes.length],
  );

  const shareImage = async (mode: ShareMode) => {
    try {
      const baseName = `cast-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      await shareForecastImage(buildCastShareSvg(scene), mode, baseName);
    } catch (error) {
      await showFailureToast(error, { title: "Could not render the image" });
    }
  };

  return (
    <Detail
      navigationTitle={`${title} · ${index + 1} of ${scenes.length}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Next Scene"
              icon={Icon.ArrowRight}
              onAction={() => setIndex((i) => (i + 1) % scenes.length)}
            />
            <Action
              title="Previous Scene"
              icon={Icon.ArrowLeft}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowLeft" },
                Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
              }}
              onAction={() => setIndex((i) => (i - 1 + scenes.length) % scenes.length)}
            />
            <Action
              title="First Scene"
              icon={Icon.ArrowLeftCircle}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowUp" },
                Windows: { modifiers: ["ctrl"], key: "arrowUp" },
              }}
              onAction={() => setIndex(0)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Share">
            {process.platform === "darwin" && (
              <>
                <Action
                  title="Copy Scene Image"
                  icon={Icon.Image}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={() => shareImage("copy")}
                />
                <Action title="Save Scene to Downloads" icon={Icon.Download} onAction={() => shareImage("save")} />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
