import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import {
  buildLookup,
  colorReference,
  colorUtilityClasses,
  getDesign,
  GlobalVariable,
  PaletteColor,
  resolveValue,
  swatchColor,
} from "./lib/design";
import { Site } from "./lib/sites";

type Filter = "all" | "colors" | "variables";

function colorName(color: PaletteColor): string {
  if (color.name) return color.name;
  const variable = color.raw?.match(/var\(--([^)]+)\)/);
  return variable ? variable[1] : (color.light ?? color.id);
}

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, error, revalidate } = useCachedPromise(getDesign, [site as Site], {
    execute: Boolean(site),
    keepPreviousData: true,
  });
  const lookup = useMemo(() => (data ? buildLookup(data) : new Map<string, string>()), [data]);

  if (!sitesLoading && sites.length === 0) {
    return (
      <NoSitesView
        onSaved={(saved) => {
          setSiteId(saved.id);
          reloadSites();
        }}
      />
    );
  }

  const commonActions = (
    <>
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </>
  );

  // Variables grouped by category, in Bricks' order.
  const variableGroups = new Map<string, GlobalVariable[]>();
  for (const variable of data?.variables ?? []) {
    const key = variable.category ?? "Uncategorized";
    variableGroups.set(key, [...(variableGroups.get(key) ?? []), variable]);
  }

  return (
    <List
      isLoading={sitesLoading || isLoading}
      searchBarPlaceholder={
        site ? `Search colors and CSS variables on ${site.name}…` : "Search colors and CSS variables…"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="Colors and Variables" value="all" />
          <List.Dropdown.Item title="Colors" value="colors" icon={Icon.Swatch} />
          <List.Dropdown.Item title="Variables" value="variables" icon={Icon.Code} />
        </List.Dropdown>
      }
    >
      <ErrorEmptyView error={error} />
      {filter !== "variables" &&
        data?.palettes.map((palette) => (
          <List.Section key={palette.id} title={palette.name} subtitle={`${palette.colors.length} colors`}>
            {palette.colors.map((color) => {
              const reference = colorReference(color);
              const swatch = swatchColor(color);
              const utilities = colorUtilityClasses(color);
              const parent = color.shade_of ? palette.colors.find((c) => c.id === color.shade_of) : undefined;
              return (
                <List.Item
                  key={color.id}
                  icon={swatch ? { source: Icon.CircleFilled, tintColor: swatch } : Icon.Swatch}
                  title={colorName(color)}
                  subtitle={reference}
                  keywords={[
                    "color",
                    palette.name,
                    color.light ?? "",
                    color.dark ?? "",
                    ...utilities.map((u) => u.className),
                  ]}
                  accessories={[
                    ...(parent
                      ? [{ tag: { value: `shade of ${colorName(parent)}`, color: Color.SecondaryText } }]
                      : []),
                    ...(utilities.length > 0
                      ? [
                          {
                            icon: Icon.Tag,
                            text: `${utilities.length}`,
                            tooltip: utilities.map((u) => u.className).join("\n"),
                          },
                        ]
                      : []),
                    ...(color.light && color.light !== reference ? [{ text: color.light }] : []),
                    ...(color.dark ? [{ tag: { value: `dark ${color.dark}`, color: Color.SecondaryText } }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Color" content={reference} />
                      <Action.Paste title="Paste Color" content={reference} />
                      {color.light && color.light !== reference && (
                        <Action.CopyToClipboard
                          title="Copy Value"
                          content={color.light}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      )}
                      {utilities.length > 0 && (
                        <ActionPanel.Submenu
                          title="Copy Utility Class…"
                          icon={Icon.Tag}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                        >
                          {utilities.map((u) => (
                            <Action.CopyToClipboard key={u.className} title={u.css} content={u.className} />
                          ))}
                        </ActionPanel.Submenu>
                      )}
                      {commonActions}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
      {filter !== "colors" &&
        [...variableGroups].map(([category, variables]) => (
          <List.Section key={category} title={`Variables · ${category}`} subtitle={`${variables.length}`}>
            {variables.map((variable) => {
              const reference = `var(--${variable.name})`;
              const resolved = resolveValue(variable.value, lookup);
              return (
                <List.Item
                  key={variable.id || variable.name}
                  icon={Icon.Code}
                  title={`--${variable.name}`}
                  subtitle={variable.value}
                  keywords={["variable", category, variable.name]}
                  accessories={
                    resolved !== variable.value ? [{ text: `= ${resolved}`, tooltip: "Resolved value" }] : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Variable Reference" content={reference} />
                      <Action.Paste title="Paste Variable Reference" content={reference} />
                      <Action.CopyToClipboard
                        title="Copy Value"
                        content={variable.value}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      {resolved !== variable.value && (
                        <Action.CopyToClipboard
                          title="Copy Resolved Value"
                          content={resolved}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Name"
                        content={`--${variable.name}`}
                        shortcut={Keyboard.Shortcut.Common.CopyName}
                      />
                      {commonActions}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
