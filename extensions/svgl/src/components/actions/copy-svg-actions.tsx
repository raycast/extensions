import { Action, Icon } from "@raycast/api";
import { Svg } from "../../type";
import { useFetchSvgCopyAction } from "../../hooks/use-svg-copy-action";

const CopySvgActions = ({ svg }: { svg: Svg }) => {
  const handleAction = useFetchSvgCopyAction(svg.id);

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
          macOS: { modifiers: ["cmd"], key: "l" },
          Windows: { modifiers: ["ctrl"], key: "l" },
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
          macOS: { modifiers: ["cmd"], key: "d" },
          Windows: { modifiers: ["ctrl"], key: "d" },
        }}
        onAction={() =>
          handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, "Copied Dark SVG text to clipboard")
        }
      />
    </>
  );
};

export default CopySvgActions;
