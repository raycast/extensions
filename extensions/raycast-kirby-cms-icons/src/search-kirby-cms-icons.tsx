import { useState, useEffect } from "react";
import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

interface KirbyIcon {
  name: string;
  id: string;
  svg: string;
}

function parseKirbyIcons(): KirbyIcon[] {
  try {
    const svgPath = join(__dirname, "assets", "icons.svg");
    const svgContent = readFileSync(svgPath, "utf-8");

    const symbolRegex = /<symbol id="(icon-[^"]+)"[^>]*>(.*?)<\/symbol>/gs;
    const icons: KirbyIcon[] = [];

    let match;
    while ((match = symbolRegex.exec(svgContent)) !== null) {
      const [, id, content] = match;
      const name = id.replace("icon-", "");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${content}</svg>`;

      icons.push({
        name,
        id,
        svg,
      });
    }

    return icons.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to parse Kirby icons:", error);
    return [];
  }
}

export default function Command() {
  const [columns, setColumns] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [icons, setIcons] = useState<KirbyIcon[]>([]);

  useEffect(() => {
    const kirbyIcons = parseKirbyIcons();
    setIcons(kirbyIcons);
    setIsLoading(false);
  }, []);

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          value={columns.toString()}
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"3"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
    >
      {icons.map((icon) => (
        <Grid.Item
          key={icon.id}
          content={{
            value: {
              source: `data:image/svg+xml;base64,${Buffer.from(icon.svg).toString("base64")}`,
              tintColor: Color.PrimaryText,
            },
            tooltip: icon.name,
          }}
          title={icon.name}
          subtitle={icon.id}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={icon.name} title="Copy Icon Name" />
              <Action.CopyToClipboard content={icon.id} title="Copy Icon ID" />
              <Action.CopyToClipboard content={icon.svg} title="Copy SVG" />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
