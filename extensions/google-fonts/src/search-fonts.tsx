import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Grid, Icon, List, popToRoot } from "@raycast/api";

import xor from "lodash.xor";
import startCase from "lodash.startcase";

import { Font } from "./types";

import * as utils from "./utils";

const FontVariantsView = (props: { font: Font }) => {
  const { font } = props;
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);

  const handleToggleVariantInSelectedVariants = (variant: string) => {
    setSelectedVariants(xor(selectedVariants, [variant]));
  };

  const handleCopyHTMLContent = (mode: string) => {
    return utils.generateHTMLContent(font, selectedVariants, mode);
  };

  const handleCopiedHTML = () => {
    popToRoot({ clearSearchBar: true });
  };
  return (
    <List searchBarPlaceholder={`Search ${font.family} variant...`} navigationTitle={`Font Variants: ${font.family}`}>
      {font.variants.map((variant, variantIndex) => {
        return (
          <List.Item
            icon={
              selectedVariants.includes(variant)
                ? { source: Icon.CircleProgress100, tintColor: Color.Green }
                : Icon.Circle
            }
            key={variantIndex}
            title={utils.friendlyFontVariant(variant)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={`Google Fonts: ${startCase(font.family)}`}>
                  <Action
                    title={selectedVariants.includes(variant) ? "De-Select Variant" : "Select Variant"}
                    icon={selectedVariants.includes(variant) ? Icon.Circle : Icon.CircleProgress100}
                    onAction={() => handleToggleVariantInSelectedVariants(variant)}
                  />
                  <Action.CopyToClipboard
                    title="Copy HTML: @import"
                    content={handleCopyHTMLContent("import")}
                    onCopy={handleCopiedHTML}
                  />
                  <Action.CopyToClipboard
                    title="Copy HTML: <link>"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    content={handleCopyHTMLContent("link")}
                    onCopy={handleCopiedHTML}
                  />
                  <Action.OpenInBrowser
                    title={`Download Family`}
                    url={utils.generateGoogleFontsURL(font, "download")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [fonts, setFonts] = useState<Font[]>([]);

  const [searchText, setSearchText] = useState("");
  const [filteredFonts, setFilteredFonts] = useState<Font[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    (async () => {
      import("./fonts").then(({ default: GoogleFontDefinitions }) => {
        setFonts(GoogleFontDefinitions);
      });
    })();
  }, []);

  useEffect(() => {
    setLoading(!fonts.length);
  }, [fonts]);

  useEffect(() => {
    setFilteredFonts(fonts.filter(utils.filterFontSearch(searchText, selectedCategory)));
  }, [fonts, searchText, selectedCategory]);

  const handleChangeCategory = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <Grid
      isLoading={loading}
      enableFiltering={false}
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search family..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Category Filter" onChange={handleChangeCategory} defaultValue={selectedCategory}>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item title={`All Categories (${fonts.length})`} value="" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Category">
            {fonts.reduce(utils.reducerFontCategory, []).map((category, categoryIndex) => (
              <Grid.Dropdown.Item
                key={"category-" + categoryIndex}
                title={`${startCase(category)} (${fonts.filter((font) => font.category === category).length})`}
                value={category}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredFonts.map((font, fontIndex) => (
        <Grid.Item
          key={`font-${fontIndex}`}
          content={{ source: utils.generateFontPreviewUrl(font), tintColor: { light: "black", dark: "white" } }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Google Fonts">
                <Action.Push title="Font Variants" icon={Icon.Lowercase} target={<FontVariantsView font={font} />} />
              </ActionPanel.Section>
              <ActionPanel.Section title="fonts.google.com">
                <Action.OpenInBrowser title={`View ${font.family}`} url={utils.generateGoogleFontsURL(font, "view")} />
                <Action.OpenInBrowser
                  title={`Download ${font.family}`}
                  url={utils.generateGoogleFontsURL(font, "download")}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
