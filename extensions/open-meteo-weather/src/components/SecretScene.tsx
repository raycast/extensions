import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { CastScene, buildCastShareSvg, renderCastScene } from "../lib/cast";
import { ShareMode, shareForecastImage } from "../lib/share";
import { svgToMarkdown } from "../lib/svg";

const SCENE_WIDTH = 660;

/** A hidden scene revealed by an easter egg in the location search. */
export function SecretScene(props: {
  make: () => { title: string; scene: CastScene };
  footnote: string;
  baseName: string;
}) {
  const { title, scene } = useMemo(() => props.make(), [props.make]);
  const markdown = useMemo(
    () => `${svgToMarkdown(renderCastScene(scene, SCENE_WIDTH, "egg-"), title)}\n\n*${props.footnote}*`,
    [scene, title, props.footnote],
  );

  const shareImage = async (mode: ShareMode) => {
    try {
      await shareForecastImage(buildCastShareSvg(scene), mode, props.baseName);
    } catch (error) {
      await showFailureToast(error, { title: "Could not render the image" });
    }
  };

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        process.platform === "darwin" ? (
          <ActionPanel>
            <Action
              title="Copy Scene Image"
              icon={Icon.Image}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => shareImage("copy")}
            />
            <Action title="Save Scene to Downloads" icon={Icon.Download} onAction={() => shareImage("save")} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
