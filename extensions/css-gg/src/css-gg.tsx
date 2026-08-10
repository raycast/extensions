import { Grid, Action, Image, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import * as icons from "css.gg/icons/icons.json";

interface Icon {
  nr: number;
  name: string;
  tags: string;
  css: string;
  svg: string;
}

interface IconProps {
  icon: Icon;
}

function GG({ icon }: IconProps) {
  const key = uuidv4();
  const keywords = [icon.name, ...(icon.tags ? icon.tags.split(" ") : [])];

  const tint = {
    light: "#000000",
    dark: "#ffffff",
    adjustContrast: true,
  };

  const encodedSvg = `data:image/svg+xml;base64,${btoa(icon.svg)}`;

  const content = {
    source: encodedSvg,
    tintColor: tint,
  };

  return (
    <Grid.Item
      key={key}
      keywords={keywords}
      content={content}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Options">
            <Action.Paste content={icon.svg} />
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={icon.svg}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenInBrowser
              url={`https://css.gg/icon/${icon.name}`}
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
  const [iconsState, setIconsState] = useState<Icon[]>([]);
  const [allIcons, setAllIcons] = useState<Icon[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("all");

  useEffect(() => {
    const allIcons = Object.values(icons).flat();
    setIconsState(allIcons);
    setAllIcons(allIcons);
  }, []);

  const tags = [...new Set(allIcons.flatMap((icon) => (icon.tags ? icon.tags.split(" ") : [])))];

  function titleCase(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const sections = tags
    .sort()
    .map((tag) => {
      const filteredIcons = iconsState
        .filter((icon) => icon.tags && icon.tags.split(" ").includes(tag))
        .sort((a, b) => a.name.localeCompare(b.name));
      const subtitle = `${filteredIcons.length} ${filteredIcons.length === 1 ? "icon" : "icons"}`;

      return {
        tag,
        section: (
          <Grid.Section key={uuidv4()} title={titleCase(tag)} subtitle={subtitle}>
            {filteredIcons.map((icon) => (
              <GG key={uuidv4()} icon={icon} />
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
              setIconsState(allIcons);
            } else {
              setSelectedTag(tag);
              setIconsState(allIcons.filter((icon) => icon.tags && icon.tags.split(" ").includes(tag)));
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
