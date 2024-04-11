import { Action } from "@raycast/api";
import { Svg } from "../type";

const SvgInfoAction = ({ svg, category }: { svg: Svg; category: string }) => {
  return (
    <>
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
    </>
  );
};

export default SvgInfoAction;
