import { environment, Cache, showHUD, Grid, ActionPanel, Action, Icon, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

import { writeFileSync } from "fs";
import { join } from "path";

import Heroicons from "./heroicons";

import got from "got";

const cache = new Cache();

export default function IconsCommand() {
  const [isLoading, setLoading] = useState(true);
  const [tags, setTags] = useState<{ [key: string]: string[] } | undefined>(
    cache.get("heroicons-tags") === undefined ? undefined : JSON.parse(cache.get("heroicons-tags") as string)
  );
  const [variant, setVariant] = useState<string>("all");

  const variantDescriptions = {
    outline: "[24x24, 1.5px stroke] For primary navigation and marketing sections, with an outlined appearance.",
    solid: "[24x24, Solid fill] For primary navigation and marketing sections, with a filled appearance.",
    mini: "[20x20, Solid fill] For smaller elements like buttons, form elements, and to support text.",
  };

  useEffect(() => {
    if (tags === undefined) {
      got(Heroicons.tags())
        .then((res) => {
          if (!res.body.startsWith("export const tags = ")) {
            showHUD("❌ An error occured.");
            throw new Error("Security vulnerability, content may be altered.");
          }

          writeFileSync(join(environment.assetsPath, "tags.mjs"), res.body);

          import(join(environment.assetsPath, "tags.mjs")).then((mod) => {
            setTags(mod.tags);
            cache.set("heroicons-tags", JSON.stringify(mod.tags));
            setLoading(false);
          });
        })
        .catch(() => {
          showHUD("❌ You need an internet connection to use this Extension.");
        });
    } else {
      setLoading(false);
    }
  }, [tags]);

  function transformToJsx(svg: string) {
    return svg
      .replaceAll(/aria-hidden/g, "ariaHidden")
      .replaceAll(/fill-rule/g, "fillRule")
      .replaceAll(/clip-rule/g, "clipRule")
      .replaceAll(/stroke-width/g, "strokeWidth");
  }

  function gridSection(variant: "outline" | "solid" | "mini") {
    return (
      <Grid.Section title={variant.charAt(0).toUpperCase() + variant.slice(1)} subtitle={variantDescriptions[variant]}>
        {tags &&
          Object.entries(tags).map((tag) => {
            const [name, keywords] = tag;
            return (
              <Grid.Item
                key={name}
                keywords={[name, ...keywords]}
                content={{
                  source: Heroicons[variant](name),
                }}
                actions={
                  <ActionPanel title="Heroicons">
                    <Action
                      title="Paste JSX"
                      onAction={() => {
                        got(Heroicons[variant](name))
                          .then((res) => {
                            Clipboard.paste(transformToJsx(res.body));
                            showHUD(`✏️ Pasted "${name}" (${variant}) to your frontmost application.`);
                          })
                          .catch(() => {
                            showHUD("❌ You need an internet connection to use this extension.");
                          });
                      }}
                      icon={Icon.CodeBlock}
                    />
                    <Action
                      title="Paste SVG"
                      onAction={() => {
                        got(Heroicons[variant](name))
                          .then((res) => {
                            Clipboard.paste(res.body);
                            showHUD(`✏️ Pasted "${name}" (${variant}) to your frontmost application.`);
                          })
                          .catch(() => {
                            showHUD("❌ You need an internet connection to use this extension.");
                          });
                      }}
                      icon={Icon.NewDocument}
                    />
                    <Action
                      title="Copy JSX"
                      onAction={() => {
                        got(Heroicons[variant](name))
                          .then((res) => {
                            Clipboard.copy(transformToJsx(res.body));
                            showHUD(`📋 Copied "${name}" (${variant}) to your clipboard.`);
                          })
                          .catch(() => {
                            showHUD("❌ You need an internet connection to use this extension.");
                          });
                      }}
                      icon={Icon.Code}
                    />
                    <Action
                      title="Copy SVG"
                      onAction={() => {
                        got(Heroicons[variant](name))
                          .then((res) => {
                            Clipboard.copy(res.body);
                            showHUD(`📋 Copied "${name}" (${variant}) to your clipboard.`);
                          })
                          .catch(() => {
                            showHUD("❌ You need an internet connection to use this Extension.");
                          });
                      }}
                      icon={Icon.EditShape}
                    />
                    <Action.CopyToClipboard title="Copy Name" content={name} icon={Icon.Tag} />
                  </ActionPanel>
                }
              />
            );
          })}
      </Grid.Section>
    );
  }

  return (
    <Grid
      isLoading={isLoading}
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
          {gridSection("outline")}
          {gridSection("solid")}
          {gridSection("mini")}
        </>
      ) : undefined}
      {variant == "outline" ? gridSection("outline") : undefined}
      {variant == "solid" ? gridSection("solid") : undefined}
      {variant == "mini" ? gridSection("mini") : undefined}
    </Grid>
  );
}
