import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { useCopySvgUrlAction } from "../../hooks/use-svg-copy-action";

const CopySvgUrlActions = ({ svg }: { svg: Svg }) => {
  const handleAction = useCopySvgUrlAction(svg.id);

  if (typeof svg.route === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG URL"
        onAction={() => handleAction(svg.route as string, "Copied SVG URL to clipboard")}
      />
    );
  }

  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title="Copy Light SVG URL"
        onAction={() =>
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.light, "Copied Light SVG URL to clipboard")
        }
      />

      <Action
        icon={Icon.Clipboard}
        title="Copy Dark SVG URL"
        onAction={() =>
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, "Copied Dark SVG URL to clipboard")
        }
      />
    </>
  );
};

export default CopySvgUrlActions;
