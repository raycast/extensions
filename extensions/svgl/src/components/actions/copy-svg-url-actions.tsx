import { Action, Icon, Toast, showToast, Clipboard } from "@raycast/api";
import { Svg } from "../../type";
import { useSvglExtension } from "../app-context";

const CopySvgUrlActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, showContent: string) => {
    addRecentSvgId(svg.id);
    Clipboard.copy(url);
    showToast({
      style: Toast.Style.Success,
      title: showContent,
    });
  };

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
