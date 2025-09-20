import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { fetchAndCopySvg } from "../../utils/fetch";
import { useSvglExtension } from "../app-context";

const CopyWordmarkSvgAction = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, showContent: string) => {
    addRecentSvgId(svg.id);
    fetchAndCopySvg(url, showContent);
  };

  if (typeof svg.wordmark === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG Wordmark File"
        onAction={() => handleAction(svg.wordmark as string, "Copied SVG Wordmark to clipboard")}
      />
    );
  }

  if (svg.wordmark !== undefined) {
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title="Copy Light SVG Wordmark File"
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "l",
          }}
          onAction={() =>
            handleAction(
              typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.light,
              "Copied Light SVG Wordmark to clipboard",
            )
          }
        />

        <Action
          icon={Icon.Clipboard}
          title="Copy Dark SVG Wordmark File"
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "d",
          }}
          onAction={() =>
            handleAction(
              typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.dark,
              "Copied Dark SVG Wordmark to clipboard",
            )
          }
        />
      </>
    );
  }

  return null;
};

export default CopyWordmarkSvgAction;
