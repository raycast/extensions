import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { fetchAndCopySvgFile } from "../../utils/fetch";
import { useSvglExtension } from "../app-context";

const CopySvgFileActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, showContent: string, fileName: string) => {
    addRecentSvgId(svg.id);
    fetchAndCopySvgFile(url, showContent, fileName);
  };

  if (typeof svg.route === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG File"
        onAction={() => handleAction(svg.route as string, "Copied SVG file to clipboard", svg.title)}
      />
    );
  }

  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title="Copy Light SVG File"
        onAction={() =>
          handleAction(
            typeof svg.route === "string" ? svg.route : svg.route.light,
            "Copied Light SVG file to clipboard",
            `${svg.title}-light`,
          )
        }
      />

      <Action
        icon={Icon.Clipboard}
        title="Copy Dark SVG File"
        onAction={() =>
          handleAction(
            typeof svg.route === "string" ? svg.route : svg.route.dark,
            "Copied Dark SVG file to clipboard",
            `${svg.title}-dark`,
          )
        }
      />
    </>
  );
};

export default CopySvgFileActions;
