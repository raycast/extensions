import { Action, Icon, Toast, showToast, Clipboard } from "@raycast/api";
import { Svg } from "../../type";
import { useSvglExtension } from "../app-context";

const CopyWordmarkSvgUrlAction = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, showContent: string) => {
    addRecentSvgId(svg.id);
    Clipboard.copy(url);
    showToast({
      style: Toast.Style.Success,
      title: showContent,
    });
  };

  if (typeof svg.wordmark === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG Wordmark URL"
        onAction={() => handleAction(svg.wordmark as string, "Copied SVG Wordmark URL to clipboard")}
      />
    );
  }

  if (svg.wordmark !== undefined) {
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title="Copy Light SVG Wordmark URL"
          onAction={() =>
            handleAction(
              typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.light,
              "Copied Light SVG Wordmark URL to clipboard",
            )
          }
        />

        <Action
          icon={Icon.Clipboard}
          title="Copy Dark SVG Wordmark URL"
          onAction={() =>
            handleAction(
              typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.dark,
              "Copied Dark SVG Wordmark URL to clipboard",
            )
          }
        />
      </>
    );
  }

  return null;
};

export default CopyWordmarkSvgUrlAction;
