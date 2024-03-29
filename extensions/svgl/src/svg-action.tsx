import { Action, ActionPanel, Icon } from "@raycast/api";
import { fetchAndCopySvg } from "./util";
import { Svg } from "./type";

interface SvgActionProps {
  svg: Svg;
  category: string;
}

const SvgAction = ({ svg, category }: SvgActionProps) => {
  return (
    <ActionPanel>
      {typeof svg.route === "string" ? (
        <Action
          icon={Icon.Clipboard}
          title="Copy SVG File"
          onAction={() => fetchAndCopySvg(svg.route as string, "Copied SVG to clipboard")}
        />
      ) : (
        <>
          <Action
            icon={Icon.Clipboard}
            title="Copy Light SVG File"
            shortcut={{
              modifiers: ["cmd"],
              key: "l",
            }}
            onAction={() =>
              fetchAndCopySvg(
                typeof svg.route === "string" ? svg.route : svg.route.light,
                "Copied Light SVG to clipboard",
              )
            }
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Dark SVG File"
            shortcut={{
              modifiers: ["cmd"],
              key: "d",
            }}
            onAction={() =>
              fetchAndCopySvg(
                typeof svg.route === "string" ? svg.route : svg.route.dark,
                "Copied Dark SVG to clipboard",
              )
            }
          />
        </>
      )}
      {typeof svg.wordmark === "string" ? (
        <Action
          icon={Icon.Clipboard}
          title="Copy SVG Wordmark File"
          onAction={() => fetchAndCopySvg("https://svgl.app" + svg.wordmark, "Copied SVG Wordmark to clipboard")}
        />
      ) : (
        svg.wordmark !== undefined && (
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
        )
      )}
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
