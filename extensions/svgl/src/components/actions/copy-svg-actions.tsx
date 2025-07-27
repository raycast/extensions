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
        title="Copy SVG Text"
        onAction={() => handleAction(svg.route as string, "Copied SVG text to clipboard")}
      />
    );
  }

  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title="Copy Light SVG Text"
        shortcut={{
          modifiers: ["cmd"],
          key: "l",
        }}
        onAction={() =>
          handleAction(
            typeof svg.route === "string" ? svg.route : svg.route.light,
            "Copied Light SVG text to clipboard",
          )
        }
      />

      <Action
        icon={Icon.Clipboard}
        title="Copy Dark SVG Text"
        shortcut={{
          modifiers: ["cmd"],
          key: "d",
        }}
        onAction={() =>
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, "Copied Dark SVG text to clipboard")
        }
      />
    </>
  );
};

export default CopySvgActions;
