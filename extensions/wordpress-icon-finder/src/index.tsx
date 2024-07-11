import { Grid, Clipboard, showHUD, Icon, ActionPanel, Action } from "@raycast/api";
import { iconsData } from "./icons";
import { useEffect, useState } from "react";

interface IconFile {
  name: string;
  path: string;
  content: string;
  keywords?: string[];
}

function buildSVG(name: string, svg: string, color: string = "#fff"): string {
  const rawSVG = `<svg id="${name}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${color}" viewBox="0 0 24 24" stroke-width="0.8">${svg}</svg>`;
  return rawSVG;
}

export default function DisplayIcon() {
  const [icons, setIcons] = useState<IconFile[]>([]);
  const [color] = useState("");

  useEffect(() => {
    const tempIcons = iconsData.map((iconData) => {
      const source = buildSVG(iconData.name, iconData.path);
      const base64 = Buffer.from(source).toString("base64");
      return {
        name: iconData.name.replace(/-/g, " "),
        path: iconData.path,
        keywords: iconData.keywords,
        content: `data:image/svg+xml;base64,${base64}`,
      };
    });

    setIcons(tempIcons);
  }, []);

  return (
    <Grid
      searchBarPlaceholder="Filter icons by name..."
      isLoading={icons.length === 0}
      columns={5}
      inset={Grid.Inset.Large}
    >
      {icons.map((icon) => (
        <Grid.Item
          key={icon.name}
          content={{ source: icon.content }}
          title={icon.name}
          subtitle={icon.keywords?.join(", ")}
          keywords={icon.keywords}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Eye}
                title="Copy Icon"
                onAction={async () => {
                  await Clipboard.copy(buildSVG(icon.name, icon.path, color));
                  await showHUD(`${icon.name.replace(/ /g, "-")} was copied to your clipboard`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
