import { Action, Keyboard } from "@raycast/api";
import { Svg } from "../../type";
import { APP_URL } from "../../utils/fetch";

const SvgInfoAction = ({ svg, category }: { svg: Svg; category: string }) => {
  return (
    <>
      <Action.CopyToClipboard title="Copy SVG Title" content={svg.title} />

      <Action.OpenInBrowser
        title="Open SVG in Browser"
        url={typeof svg.route === "string" ? svg.route : svg.route.light}
        shortcut={Keyboard.Shortcut.Common.Open}
      />

      <Action.OpenInBrowser
        title={`Visit ${svg.title} Website`}
        url={svg.url}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "v" },
          Windows: { modifiers: ["ctrl"], key: "v" },
        }}
      />

      {svg.brandUrl && (
        <Action.OpenInBrowser
          title={`Visit ${svg.title} Brand Website`}
          url={svg.brandUrl}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "b" },
            Windows: { modifiers: ["ctrl"], key: "b" },
          }}
        />
      )}

      <Action.OpenInBrowser
        title="Visit This Category in Svgl"
        url={`${APP_URL}/${category !== "All" ? `directory/${category.toLowerCase()}` : ""}`}
        shortcut={Keyboard.Shortcut.Common.Save}
      />
    </>
  );
};

export default SvgInfoAction;
