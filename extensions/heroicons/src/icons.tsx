import {
  environment,
  Cache,
  showHUD,
  Grid,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { writeFileSync } from "fs";
import { join } from "path";
import Heroicons from "./heroicons";
import got from "got";
import title from "title";

interface Preferences {
  primaryAction: string;
  secondaryAction: string;
}

const cache = new Cache();

export default function IconsCommand() {
  const [isLoading, setLoading] = useState(true);
  const [tags, setTags] = useState<{ [key: string]: string[] }>(
    cache.get("heroicons-tags") === undefined ? {} : JSON.parse(cache.get("heroicons-tags") as string)
  );
  const [iconNames, setIconNames] = useState<string[]>(cache.get("heroicons-icons")?.split(",") || []);
  const [variant, setVariant] = useState<string>("all");
  const [preferences, _] = useState(getPreferenceValues<Preferences>());

  const variantDescriptions = {
    outline: "[24x24, 1.5px stroke] For primary navigation and marketing sections, with an outlined appearance.",
    solid: "[24x24, Solid fill] For primary navigation and marketing sections, with a filled appearance.",
    mini: "[20x20, Solid fill] For smaller elements like buttons, form elements, and to support text.",
  };

  const actions: { [key: string]: (variant: "outline" | "solid" | "mini", icon: string) => JSX.Element } = {
    pasteJSX: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Paste JSX"
        key={`pastejsx-${icon}`}
        onAction={() => {
          got(Heroicons[variant](icon))
            .then((res) => {
              Clipboard.paste(transformToJsx(res.body));
              showHUD(`✏️ Pasted "${icon}" (${variant}) to your frontmost application.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this extension.");
            });
        }}
        icon={Icon.CodeBlock}
      />
    ),
    pasteSVG: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Paste SVG"
        key={`pastesvg-${icon}`}
        onAction={() => {
          got(Heroicons[variant](icon))
            .then((res) => {
              Clipboard.paste(res.body);
              showHUD(`✏️ Pasted "${icon}" (${variant}) to your frontmost application.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this extension.");
            });
        }}
        icon={Icon.NewDocument}
      />
    ),
    copyJSX: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Copy JSX"
        key={`copyjsx-${icon}`}
        onAction={() => {
          got(Heroicons[variant](icon))
            .then((res) => {
              Clipboard.copy(transformToJsx(res.body));
              showHUD(`📋 Copied "${icon}" (${variant}) to your clipboard.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this extension.");
            });
        }}
        icon={Icon.Code}
      />
    ),
    copySVG: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Copy SVG"
        key={`copysvg-${icon}`}
        onAction={() => {
          got(Heroicons[variant](icon))
            .then((res) => {
              Clipboard.copy(res.body);
              showHUD(`📋 Copied "${icon}" (${variant}) to your clipboard.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this Extension.");
            });
        }}
        icon={Icon.EditShape}
      />
    ),
    copyName: (_: "outline" | "solid" | "mini", icon: string) => (
      <Action.CopyToClipboard key={`copyname-${icon}`} title="Copy Name" content={icon} icon={Icon.Tag} />
    ),
  };

  useEffect(() => {
    if (preferences.primaryAction == preferences.secondaryAction) {
      showToast({
        title: "⚠️ Warning",
        message: "You have set the same action as primary and secondary. This may cause conflicts.",
        style: Toast.Style.Failure,
      });
    }
    if (tags || iconNames) {
      Promise.all([got(Heroicons.tags()), got(Heroicons.icons())])
        .then(([tagsRes, iconsRes]) => {
          if (!tagsRes.body.startsWith("export const tags = ")) {
            showHUD("❌ An error occured.");
            throw new Error("Security vulnerability, content may be altered.");
          }

          setIconNames(iconsRes.body.split("\n").map((x) => x.replace(".svg", "")));
          cache.set("heroicons-icons", iconNames.join(","));

          writeFileSync(join(environment.assetsPath, "tags.mjs"), tagsRes.body);
          import(join(environment.assetsPath, "tags.mjs")).then((mod) => {
            setTags(mod.tags);
            cache.set("heroicons-tags", JSON.stringify(mod.tags));
            setLoading(false);
          });
        })
        .catch(() => {
          showHUD("❌ An error occured. Try again later.");
        });
    } else {
      setLoading(false);
    }
  }, []);

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
        {iconNames.map((icon) => {
          return (
            <Grid.Item
              key={icon}
              keywords={tags[icon]?.concat(icon.replaceAll("-", " "))}
              title={title(icon)}
              subtitle={title(variant)}
              content={{
                source: Heroicons[variant](icon),
                tintColor: Color.PrimaryText,
              }}
              actions={
                <ActionPanel title="Heroicons">
                  {preferences.primaryAction == preferences.secondaryAction ? (
                    <>{actions[preferences.primaryAction](variant, icon)}</>
                  ) : (
                    <>
                      {actions[preferences.primaryAction](variant, icon)}
                      {actions[preferences.secondaryAction](variant, icon)}
                    </>
                  )}
                  {Object.entries(actions).map((action) => {
                    const [name, fn] = action;
                    if (name == preferences.primaryAction || name == preferences.secondaryAction) return;
                    return fn(variant, icon);
                  })}
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
