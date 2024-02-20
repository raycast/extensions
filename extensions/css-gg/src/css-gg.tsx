import { Grid, Action, Image, ActionPanel, Cache } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface Icon {
  nr: number;
  name: string;
  tags: string;
  css: string;
  views: string;
  downloads: string;
  bytes: string;
  markup: string;
  standard: string;
  import: string;
  json: string;
  svg_path: string;
}

interface ApiResponse {
  [key: string]: Icon[];
}

interface IconProps {
  icon: Icon;
  svgPath: string;
}

function IconComponent({ icon, svgPath }: IconProps) {
  const key = uuidv4();
  const keywords = [icon.name, ...icon.tags.split(" ")];

  const tint = {
    light: "#000000",
    dark: "#ffffff",
    adjustContrast: true,
  };

  const content = {
    source: svgPath + icon.name + ".svg",
    tintColor: tint,
  };

  const decorator = (browser: string) => ({
    source: svgPath + browser + ".svg",
    tintColor: tint,
  });

  return (
    <Grid.Item
      key={key}
      keywords={keywords}
      content={content}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Options">
            <Action.Paste content={icon.svg_path} icon={decorator("browser")} />
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={icon.svg_path}
              icon={decorator("clipboard")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenInBrowser
              url={`https://css.gg/${icon.name}`}
              shortcut={{ modifiers: ["shift"], key: "enter" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Author">
            <Action.OpenInBrowser
              title="Astrit"
              icon={{ source: "https://github.com/astrit.png", mask: Image.Mask.Circle }}
              url="https://github.com/astrit"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [allIcons, setAllIcons] = useState<Icon[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const svgPath = "https://cdn.css.gg/svg/";

  useEffect(() => {
    const cache = new Cache();
    const cachedResponse = cache.get("icons");

    if (cachedResponse) {
      const allIcons = Object.values(JSON.parse(cachedResponse) as ApiResponse).flat();
      setIcons(allIcons);
      setAllIcons(allIcons);
    } else {
      fetch("https://cdn.css.gg/icons.json")
        .then((response) => response.json())
        .then((data: unknown) => {
          const allIcons = Object.values(data as ApiResponse).flat();
          setIcons(allIcons);
          setAllIcons(allIcons);
          cache.set("icons", JSON.stringify(data));
        });
    }
  }, []);

  const tags = [...new Set(allIcons.flatMap((icon) => icon.tags.split(" ")))];

  function titleCase(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const sections = tags
    .sort()
    .map((tag) => {
      const filteredIcons = icons
        .filter((icon) => icon.tags.split(" ").includes(tag))
        .sort((a, b) => a.name.localeCompare(b.name));
      const subtitle = `${filteredIcons.length} ${filteredIcons.length === 1 ? "icon" : "icons"}`;

      return {
        tag,
        section: (
          <Grid.Section key={uuidv4()} title={titleCase(tag)} subtitle={subtitle}>
            {filteredIcons.map((icon) => (
              <IconComponent key={uuidv4()} icon={icon} svgPath={svgPath} />
            ))}
          </Grid.Section>
        ),
      };
    })
    .filter((section) => section.tag === selectedTag || selectedTag === "all" || selectedTag === "pinned");

  return (
    <Grid
      navigationTitle="Search Icons"
      inset={Grid.Inset.Large}
      columns={8}
      searchBarPlaceholder="Search icons e.g chevron"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Category"
          defaultValue="all"
          onChange={(tag) => {
            if (tag === "all") {
              setSelectedTag(tag);
              setIcons(allIcons);
            } else {
              setSelectedTag(tag);
              setIcons(allIcons.filter((icon) => icon.tags.split(" ").includes(tag)));
            }
          }}
          value={selectedTag}
          filtering={true}
        >
          <Grid.Dropdown.Section title="Categories">
            <Grid.Dropdown.Item key={uuidv4()} title="All" value="all" />
            {tags.sort().map((tag) => {
              return <Grid.Dropdown.Item key={uuidv4()} title={`${titleCase(tag)}`} value={tag} keywords={[tag]} />;
            })}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {sections.map((section) => section.section)}
    </Grid>
  );
}
