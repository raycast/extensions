import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { fetchAndCopySvg } from "../../utils/fetch";
import { useSvglExtension } from "../app-context";

const CopySvgActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, showContent: string) => {
    addRecentSvgId(svg.id);
    fetchAndCopySvg(url, showContent);
  };

  if (typeof svg.route === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG File"
        onAction={() => handleAction(svg.route as string, "Copied SVG to clipboard")}
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
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.light, "Copied Light SVG to clipboard")
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
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, "Copied Dark SVG to clipboard")
        }
      />
    </>
  );
};

export default CopySvgActions;
