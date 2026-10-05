import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { useCopySvgUrlAction } from "../../hooks/use-svg-copy-action";

const CopyWordmarkSvgUrlAction = ({ svg }: { svg: Svg }) => {
  const handleAction = useCopySvgUrlAction(svg.id);

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
    const wordmark = svg.wordmark;
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title="Copy Light SVG Wordmark URL"
          onAction={() =>
            handleAction(
              typeof wordmark === "string" ? wordmark : wordmark.light,
              "Copied Light SVG Wordmark URL to clipboard",
            )
          }
        />

        <Action
          icon={Icon.Clipboard}
          title="Copy Dark SVG Wordmark URL"
          onAction={() =>
            handleAction(
              typeof wordmark === "string" ? wordmark : wordmark.dark,
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
