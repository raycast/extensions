import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import path from "path";
import fs from "fs";

interface AzureIcon {
  name: string;
  iconPath: string;
  folder: string;
}

export default function Command() {
  const [columns, setColumns] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [icons, setIcons] = useState<AzureIcon[]>([]);

  function formatServiceName(filename: string): string {
    const regex = /^\d+-icon-service-(.+)\.svg$/i;
    const match = filename.match(regex);
    if (!match) {
      return filename
        .replace(/\.[^.]+$/, "")
        .split("-")
        .join(" ");
    }
    return match[1].split("-").join(" ");
  }

  useEffect(() => {
    const fetchIcons = async () => {
      setIsLoading(true);
      const _icons: AzureIcon[] = [];
      try {
        const dir = await fs.promises.opendir(path.resolve(__dirname, "assets/icons"));
        for await (const dirent of dir) {
          const svgs = await fs.promises.opendir(path.resolve(__dirname, `assets/icons/${dirent.name}`));
          for await (const svg of svgs) {
            if (
              svg.name.endsWith(".svg") &&
              _icons.filter((icon) => icon.name === formatServiceName(svg.name)).length === 0
            ) {
              _icons.push({
                name: formatServiceName(svg.name),
                iconPath: path.resolve(__dirname, `assets/icons/${dirent.name}/${svg.name}`),
                folder: dirent.name,
              });
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
      setIcons(_icons);
      setIsLoading(false);
    };

    fetchIcons();
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
      {!isLoading &&
        icons.map((icon) => (
          <Grid.Item
            key={icon.name}
            content={{ value: { source: icon.iconPath }, tooltip: icon.name }}
            title={icon.name}
            subtitle={icon.folder}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={{ file: icon.iconPath }} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
