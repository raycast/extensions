import { ActionPanel, Action, Grid } from "@raycast/api";
import Icons from "../node_modules/@mynaui/icons/meta.json";

// Gets a svg path string and wraps it in an SVG tag (for regular icons)
function buildSVG(svg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor">${svg}</svg>`;
}

// Gets a svg path string and wraps it in an SVG tag (for solid icons)
function buildSolidSVG(code: string): string {
  return `<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${code}</svg>`;
}

// Gets a svg string and returns a data url
function buildDataURL(svg: string, isSolid: boolean = false): string {
  const rawSVG = isSolid ? buildSolidSVG(svg) : buildSVG(svg);
  const base64SVG = Buffer.from(rawSVG).toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;
  return dataUrl;
}

// Converts a string to PascalCase
const toPascalCase = (str: string, type: string) =>
  str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("") + (type === "solid" ? "Solid" : "");

export default function Command() {
  return (
    <Grid columns={7} inset={Grid.Inset.Large}>
      <Grid.EmptyView
        title="Nothing found."
        description="Press Enter to request this icon"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://github.com/praveenjuge/mynaui-icons/issues" title="Open GitHub Issues" />
          </ActionPanel>
        }
      />
      {Object.entries(Icons).flatMap((icon) => [
        // Regular icon
        <Grid.Item
          key={`${icon[0]}-regular`}
          title={icon[0]}
          keywords={[...icon[1].tags, "regular"]}
          content={{ source: buildDataURL(icon[1].regular) }}
          actions={
            <ActionPanel>
              <Action.Paste content={buildSVG(icon[1].regular)} />
              <Action.CopyToClipboard content={buildSVG(icon[1].regular)} />
              <Action.CopyToClipboard
                content={`<${toPascalCase(icon[0], "regular")} />`}
                title="Copy Component Name to Clipboard"
              />
              <Action.OpenInBrowser url={`https://mynaui.com/icons/${icon[0]}`} />
            </ActionPanel>
          }
        />,
        // Solid icon
        <Grid.Item
          key={`${icon[0]}-solid`}
          title={`${icon[0]} (Solid)`}
          keywords={[...icon[1].tags, "solid"]}
          content={{ source: buildDataURL(icon[1].solid, true) }}
          actions={
            <ActionPanel>
              <Action.Paste content={buildSolidSVG(icon[1].solid)} />
              <Action.CopyToClipboard content={buildSolidSVG(icon[1].solid)} />
              <Action.CopyToClipboard
                content={`<${toPascalCase(icon[0], "solid")} />`}
                title="Copy Component Name to Clipboard"
              />
              <Action.OpenInBrowser url={`https://mynaui.com/icons/${icon[0]}/solid`} />
            </ActionPanel>
          }
        />,
      ])}
    </Grid>
  );
}
