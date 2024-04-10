import {
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
import title from "title";
import fetch from "node-fetch";

import Heroicons from "./heroicons";

interface Preferences {
  primaryAction: string;
  secondaryAction: string;
  importTemplate: string;
}

const cache = new Cache();

export default function IconsCommand() {
  const [isLoading, setLoading] = useState(true);
  const [iconNames, setIconNames] = useState<string[]>(cache.get("heroicons-icons")?.split(",") || []);
  const [variant, setVariant] = useState<string>("all");
  const [preferences] = useState(getPreferenceValues<Preferences>());

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
          fetch(Heroicons[variant](icon))
            .then((res) => res.text())
            .then((res) => {
              Clipboard.paste(transformToJsx(res));
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
          fetch(Heroicons[variant](icon))
            .then((res) => res.text())
            .then((res) => {
              Clipboard.paste(res);
              showHUD(`✏️ Pasted "${icon}" (${variant}) to your frontmost application.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this extension.");
            });
        }}
        icon={Icon.NewDocument}
      />
    ),
    pasteReactImport: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Paste React Import"
        key={`pasteReactImport-${icon}`}
        onAction={async () => {
          const iconPath = variant === "mini" ? "20/solid" : `24/${variant}`;
          const template = preferences.importTemplate
            .replace("%icon_name%", `${toUpperCamelCase(icon)}Icon`)
            .replace("%library%", "react")
            .replace("%icon_path%", iconPath);

          await Clipboard.paste(template);
          await showHUD(`✏️ Pasted "${icon}" (${variant}) to your frontmost application.`);
        }}
        icon={Icon.CodeBlock}
      />
    ),
    pasteVueImport: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Paste Vue Import"
        key={`pasteVuImport-${icon}`}
        onAction={async () => {
          const iconPath = variant === "mini" ? "20/solid" : `24/${variant}`;
          const template = preferences.importTemplate
            .replace("%icon_name%", `${toUpperCamelCase(icon)}Icon`)
            .replace("%library%", "vue")
            .replace("%icon_path%", iconPath);

          await Clipboard.paste(template);
          await showHUD(`✏️ Pasted "${icon}" (${variant}) to your frontmost application.`);
        }}
        icon={Icon.CodeBlock}
      />
    ),
    copyJSX: (variant: "outline" | "solid" | "mini", icon: string) => (
      <Action
        title="Copy JSX"
        key={`copyjsx-${icon}`}
        onAction={() => {
          fetch(Heroicons[variant](icon))
            .then((res) => res.text())
            .then((res) => {
              Clipboard.copy(transformToJsx(res));
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
          fetch(Heroicons[variant](icon))
            .then((res) => res.text())
            .then((res) => {
              Clipboard.copy(res);
              showHUD(`📋 Copied "${icon}" (${variant}) to your clipboard.`);
            })
            .catch(() => {
              showHUD("❌ You need an internet connection to use this Extension.");
            });
        }}
        icon={Icon.EditShape}
      />
    ),
    copyReactImport: (variant: "outline" | "solid" | "mini", icon: string) => {
      const iconPath = variant === "mini" ? "20/solid" : `24/${variant}`;
      const template = preferences.importTemplate
        .replace("%icon_name%", `${toUpperCamelCase(icon)}Icon`)
        .replace("%library%", "react")
        .replace("%icon_path%", iconPath);

      return (
        <Action.CopyToClipboard
          key={`copyReactImport-${icon}`}
          title="Copy React Import"
          content={template}
          icon={Icon.Code}
        />
      );
    },
    copyVueImport: (variant: "outline" | "solid" | "mini", icon: string) => {
      const iconPath = variant === "mini" ? "20/solid" : `24/${variant}`;
      const template = preferences.importTemplate
        .replace("%icon_name%", `${toUpperCamelCase(icon)}Icon`)
        .replace("%library%", "vue")
        .replace("%icon_path%", iconPath);

      return (
        <Action.CopyToClipboard
          key={`copyVueImport-${icon}`}
          title="Copy Vue Import"
          content={template}
          icon={Icon.Code}
        />
      );
    },
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
    if (iconNames) {
      Promise.all([fetch(Heroicons.icons()).then((res) => res.text())])
        .then(([iconsRes]) => {
          setIconNames(iconsRes.split("\n").map((x) => x.replace(".svg", "")));
          cache.set("heroicons-icons", iconNames.join(","));
        })
        .catch(() => {
          showHUD("❌ An error occured. Try again later.");
        })
        .finally(() => {
          setLoading(false);
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

  function toUpperCamelCase(string: string) {
    const camelCaseString = string.replace(/[-_]\w/gi, (match) => match[1].toUpperCase());

    return camelCaseString.charAt(0).toUpperCase() + camelCaseString.slice(1);
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
      columns={8}
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
