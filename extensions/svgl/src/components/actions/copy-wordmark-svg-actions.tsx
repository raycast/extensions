import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { useFetchSvgCopyAction } from "../../hooks/use-svg-copy-action";

const CopyWordmarkSvgAction = ({ svg }: { svg: Svg }) => {
  const handleAction = useFetchSvgCopyAction(svg.id);

  if (typeof svg.wordmark === "string") {
    return (
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG Wordmark Text"
        onAction={() => handleAction(svg.wordmark as string, "Copied SVG Wordmark to clipboard")}
      />
    );
  }

  if (svg.wordmark !== undefined) {
    const wordmark = svg.wordmark;
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title="Copy Light SVG Wordmark Text"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "l" },
            Windows: { modifiers: ["ctrl", "shift"], key: "l" },
          }}
          onAction={() =>
            handleAction(
              typeof wordmark === "string" ? wordmark : wordmark.light,
              "Copied Light SVG Wordmark to clipboard",
            )
          }
        />

        <Action
          icon={Icon.Clipboard}
          title="Copy Dark SVG Wordmark Text"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={() =>
            handleAction(
              typeof wordmark === "string" ? wordmark : wordmark.dark,
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
