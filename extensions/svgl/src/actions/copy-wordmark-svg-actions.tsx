import { Action, Icon } from "@raycast/api";
import { Svg } from "../type";
import { fetchAndCopySvg } from "../util";

const CopyWordmarkSvgAction = ({ svg }: { svg: Svg }) => {
  if (typeof svg.wordmark === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG Wordmark File"
        onAction={() => fetchAndCopySvg("https://svgl.app" + svg.wordmark, "Copied SVG Wordmark to clipboard")}
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
            fetchAndCopySvg(
              "https://svgl.app" + (typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.light),
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
            fetchAndCopySvg(
              "https://svgl.app" + (typeof svg.wordmark === "string" ? svg.wordmark : svg.wordmark?.dark),
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
