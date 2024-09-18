import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import Icons from "../node_modules/@mynaui/icons/meta.json";

// Gets a svg path string and wraps it in an SVG tag
function buildSVG(svg: string): string {
  const rawSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor">${svg}</svg>`;
  return rawSVG;
}

// Gets a svg string and returns a data url
function buildDataURL(svg: string): string {
  const rawSVG = buildSVG(svg);
  const base64SVG = Buffer.from(rawSVG).toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;
  return dataUrl;
}

// Converts a string to PascalCase
function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

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
      {Object.entries(Icons).map((icon) => (
        <Grid.Item
          key={icon[0]}
          title={icon[0]}
          keywords={icon[1].tags}
          content={{
            source: buildDataURL(icon[1].svg),
            tintColor: Color.PrimaryText,
          }}
          actions={
            <ActionPanel>
              <Action.Paste content={buildSVG(icon[1].svg)} />
              <Action.CopyToClipboard content={buildSVG(icon[1].svg)} />
              <Action.CopyToClipboard
                content={`<${toPascalCase(icon[0])} />`}
                title="Copy Component Name to Clipboard"
              />
              <Action.OpenInBrowser url={`https://icons.mynaui.com/icons/${icon[0]}`} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
