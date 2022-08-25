import { useState } from "react";
import { environment, Grid, Action, ActionPanel, Icon } from "@raycast/api";
import { join } from "path";
import { readFileSync } from "fs";

import data from "./data";
import title from "title";

const iconsPath = join(environment.assetsPath, "icons");
const icons = {
  mini: join(iconsPath, "mini"),
  solid: join(iconsPath, "solid"),
  outline: join(iconsPath, "outline"),
};

export default function Command() {
  const [variant, setVariant] = useState<string>("all");

  function gridItems(variant: "outline" | "solid" | "mini") {
    const items: JSX.Element[] = [];
    Object.entries(data).map((entry) => {
      const [name, keywords] = entry;
      const svg = readFileSync(join(icons[variant], `${name}.svg`)).toString();
      const jsx = svg
        .replaceAll(/aria-hidden/g, "ariaHidden")
        .replaceAll(/fill-rule/g, "fillRule")
        .replaceAll(/clip-rule/g, "clipRule");
      items.push(
        <Grid.Item
          key={name}
          content={{
            source: join(icons[variant], `${name}.svg`),
          }}
          keywords={keywords}
          title={title(name)}
          subtitle={title(variant)}
          actions={
            <ActionPanel title="Heroicons">
              <Action.Paste title="Paste JSX" content={jsx} icon={Icon.CodeBlock} />
              <Action.Paste title="Paste SVG" content={svg} icon={Icon.NewDocument} />
              <Action.CopyToClipboard title="Copy JSX" content={jsx} icon={Icon.Code} />
              <Action.CopyToClipboard title="Copy SVG" content={svg} icon={Icon.EditShape} />
              <Action.CopyToClipboard title="Copy Name" content={name} icon={Icon.Tag} />
            </ActionPanel>
          }
        />
      );
    });
    return items;
  }

  return (
    <Grid
      navigationTitle="Search Heroicons"
      searchBarPlaceholder="Search all icons..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select variant" storeValue={true} onChange={(newVariant) => setVariant(newVariant)}>
          <Grid.Dropdown.Section title="Icon Variants">
            <Grid.Dropdown.Item title="All" value="all" key={0} />
            <Grid.Dropdown.Item title="Outline" value="outline" key={1} />
            <Grid.Dropdown.Item title="Solid" value="solid" key={2} />
            <Grid.Dropdown.Item title="Mini" value="mini" key={3} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Small}
    >
      {variant == "all" ? (
        <>
          <Grid.Section
            title="Outline"
            subtitle="[24x24, 1.5px stroke] For primary navigation and marketing sections, with an outlined appearance."
          >
            {gridItems("outline")}
          </Grid.Section>
          <Grid.Section
            title="Solid"
            subtitle="[24x24, Solid fill] For primary navigation and marketing sections, with a filled appearance."
          >
            {gridItems("solid")}
          </Grid.Section>
          <Grid.Section
            title="Mini"
            subtitle="[20x20, Solid fill] For smaller elements like buttons, form elements, and to support text."
          >
            {gridItems("mini")}
          </Grid.Section>
        </>
      ) : undefined}
      {variant == "outline" ? gridItems("outline") : undefined}
      {variant == "solid" ? gridItems("solid") : undefined}
      {variant == "mini" ? gridItems("mini") : undefined}
    </Grid>
  );
}
