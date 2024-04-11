import { Action, Icon } from "@raycast/api";
import { Svg } from "../type";
import { fetchAndCopySvg } from "../util";

const CopySvgActions = ({ svg }: { svg: Svg }) => {
  if (typeof svg.route === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG File"
        onAction={() => fetchAndCopySvg(svg.route as string, "Copied SVG to clipboard")}
      />
    );
  }

  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title="Copy Light SVG File"
        shortcut={{
          modifiers: ["cmd"],
          key: "l",
        }}
        onAction={() =>
          fetchAndCopySvg(typeof svg.route === "string" ? svg.route : svg.route.light, "Copied Light SVG to clipboard")
        }
      />

      <Action
        icon={Icon.Clipboard}
        title="Copy Dark SVG File"
        shortcut={{
          modifiers: ["cmd"],
          key: "d",
        }}
        onAction={() =>
          fetchAndCopySvg(typeof svg.route === "string" ? svg.route : svg.route.dark, "Copied Dark SVG to clipboard")
        }
      />
    </>
  );
};

export default CopySvgActions;
