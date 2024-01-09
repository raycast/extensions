import { Action, ActionPanel, Icon, environment } from "@raycast/api";
import { fetchAndCopySvg } from "./util";
import { Svg } from "./type";

interface SvgActionProps {
  svg: Svg;
  category: string;
}

const SvgAction = ({ svg, category }: SvgActionProps) => {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG File"
        onAction={() =>
          fetchAndCopySvg(
            typeof svg.route === "string"
              ? svg.route
              : environment.appearance === "dark"
                ? svg.route.dark
                : svg.route.light,
          )
        }
      />
      <Action.CopyToClipboard title="Copy SVG Title" content={svg.title} />
      <Action.OpenInBrowser
        title="Open SVG in Browser"
        url={typeof svg.route === "string" ? svg.route : svg.route.light}
        shortcut={{
          modifiers: ["cmd"],
          key: "o",
        }}
      />
      <Action.OpenInBrowser
        title={`Visit ${svg.title} Website`}
        url={svg.url}
        shortcut={{
          modifiers: ["cmd"],
          key: "v",
        }}
      />
      <Action.OpenInBrowser
        title="Visit This Category in Svgl"
        url={`https://svgl.app/${category !== "All" ? `directory/${category.toLowerCase()}` : ""}`}
        shortcut={{
          modifiers: ["cmd"],
          key: "s",
        }}
      />
    </ActionPanel>
  );
};

export default SvgAction;
