import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import Icons from "../node_modules/@mynaui/icons/meta.json";
import { useState } from "react";

// Builds SVG string based on type
function buildSVG(svg: string, type: string): string {
  const commonProps = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"';
  return type === "regular"
    ? `<svg ${commonProps} fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor">${svg}</svg>`
    : `<svg ${commonProps} fill="currentColor">${svg}</svg>`;
}

// Converts a string to PascalCase
const toPascalCase = (str: string, type: string) =>
  str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("") + (type === "solid" ? "Solid" : "");

export default function Command() {
  const [type, setType] = useState("regular");

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      searchBarAccessory={
        <Grid.Dropdown
          storeValue={true}
          onChange={setType}
          defaultValue="regular"
          tooltip="Icon Category"
          placeholder="Select Icon Category"
        >
          {["regular", "solid"].map((value) => (
            <Grid.Dropdown.Item key={value} title={value.charAt(0).toUpperCase() + value.slice(1)} value={value} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        title="No icons found."
        description="Press Enter to request this icon"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://github.com/praveenjuge/mynaui-icons/issues" title="Open GitHub Issues" />
          </ActionPanel>
        }
      />
      {Object.entries(Icons).map(([name, icon]) => {
        const iconData = icon[type as keyof typeof icon];
        const svg = buildSVG(Array.isArray(iconData) ? iconData[0] : iconData, type);
        return (
          <Grid.Item
            key={name}
            title={name}
            keywords={icon.tags}
            content={{
              source: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
              tintColor: Color.PrimaryText,
            }}
            actions={
              <ActionPanel>
                <Action.Paste content={svg} />
                <Action.CopyToClipboard content={svg} />
                <Action.CopyToClipboard
                  content={`<${toPascalCase(name, type)} />`}
                  title="Copy Component Name to Clipboard"
                />
                <Action.OpenInBrowser
                  url={
                    type === "regular" ? `https://mynaui.com/icons/${name}` : `https://mynaui.com/icons/${name}/solid`
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
