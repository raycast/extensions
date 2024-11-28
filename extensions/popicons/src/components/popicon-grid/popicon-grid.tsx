import { Action, ActionPanel, Clipboard, Color, Grid, Icon, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import svgtojsx from "svg-to-jsx";
import { Toasts } from "../../constants/toasts";
import { PopiconLogo } from "../../enums/popicon-logo";
import { PopiconVariant } from "../../enums/popicon-variant";
import { changeColor } from "../../helpers/change-color";
import { getColumnAmount } from "../../helpers/get-column-amount";
import { getVariantName } from "../../helpers/get-variant-name";
import { prettifySvg } from "../../helpers/prettify-svg";
import { sentenceCaseToTitleCase } from "../../helpers/sentence-case-to-title-case";
import { usePopiconVariant } from "../../hooks/use-popicon-variant";
import { popiconCategoriesQuery } from "../../queries/popicon-query";
import { Popicon } from "../../schemas/popicon";

const preferences = getPreferenceValues<ExtensionPreferences>();

export function PopiconGrid() {
  const [variant, setVariant] = usePopiconVariant(PopiconVariant.Line);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [newIcons, setNewIcons] = useCachedState<Array<Popicon>>("new-icons");

  const { data: categories, status } = useQuery(
    popiconCategoriesQuery(variant, {
      onNewIcons: (newIcons) => {
        setNewIcons(newIcons);
        showToast({
          title: "🎉 New Icons Added",
          message: `We've added ${newIcons.length} new Popicons.`,
        });
      },
    })
  );

  return (
    <Grid
      isLoading={status === "pending"}
      searchBarPlaceholder="Search icons..."
      inset={Grid.Inset.Large}
      onSelectionChange={setSelectedIconId}
      columns={getColumnAmount(preferences.iconPreviewSize)}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Style"
          placeholder="Search Style ..."
          value={variant}
          onChange={(variant) => setVariant(variant as PopiconVariant)}
        >
          <Grid.Dropdown.Item title={getVariantName(PopiconVariant.Line)} value={PopiconVariant.Line} />
          <Grid.Dropdown.Item title={getVariantName(PopiconVariant.Solid)} value={PopiconVariant.Solid} />
          <Grid.Dropdown.Item title={getVariantName(PopiconVariant.Duotone)} value={PopiconVariant.Duotone} />
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={{ source: { light: PopiconLogo.Light, dark: PopiconLogo.Dark } }}
        title="Icons Not Found"
        description="Press enter to get the icon set from the Popicon website."
        actions={
          <ActionPanel>
            <PopiconGridPromoActions />
          </ActionPanel>
        }
      />
      {newIcons && newIcons.length > 0 && (
        <Grid.Section title="New" subtitle={`${newIcons.length}`}>
          {newIcons?.map((icon) => (
            <Grid.Item
              key={icon.icon}
              id={`${icon.icon}-new`}
              keywords={[icon.icon, ...icon.tags]}
              content={`data:image/svg+xml,${changeColor(icon.svg, Color.PrimaryText).replaceAll("\n", "")}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Copy SVG"
                      icon={Icon.Clipboard}
                      onAction={() => {
                        const processedSvg = changeColor(icon.svg, preferences.color);
                        const prettifiedSvg = prettifySvg(processedSvg);

                        Clipboard.copy(prettifiedSvg);
                        showToast(Toasts.CopiedPopicon.Success);
                      }}
                    />
                    <Action
                      title="Copy JSX"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        const processedSvg = changeColor(icon.svg, preferences.color);
                        const prettifiedSvg = prettifySvg(processedSvg);
                        const jsxString = await svgtojsx(prettifiedSvg);

                        Clipboard.copy(jsxString);
                        showToast(Toasts.CopiedPopicon.Success);
                      }}
                    />
                    <Action
                      title="Copy Name"
                      icon={Icon.Clipboard}
                      onAction={() => {
                        Clipboard.copy(icon.icon);
                        showToast(Toasts.CopiedPopiconName.Success);
                      }}
                    />
                  </ActionPanel.Section>
                  <PopiconGridPromoActions />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
      {categories?.map((category) => (
        <Grid.Section
          key={category.title}
          subtitle={category?.icons?.length.toString()}
          title={category?.title && sentenceCaseToTitleCase(category.title)}
        >
          {category.icons?.map((icon) => (
            <Grid.Item
              key={icon.icon}
              id={icon.icon}
              keywords={[icon.icon, ...icon.tags]}
              content={`data:image/svg+xml,${changeColor(icon.svg, Color.PrimaryText).replaceAll("\n", "")}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Copy SVG"
                      icon={Icon.Clipboard}
                      onAction={() => {
                        const processedSvg = changeColor(icon.svg, preferences.color);
                        const prettifiedSvg = prettifySvg(processedSvg);

                        Clipboard.copy(prettifiedSvg);
                        showToast(Toasts.CopiedPopicon.Success);
                      }}
                    />
                    <Action
                      title="Copy JSX"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        const processedSvg = changeColor(icon.svg, preferences.color);
                        const prettifiedSvg = prettifySvg(processedSvg);
                        const jsxString = await svgtojsx(prettifiedSvg);

                        Clipboard.copy(jsxString);
                        showToast(Toasts.CopiedPopicon.Success);
                      }}
                    />
                    <Action
                      title="Copy Name"
                      icon={Icon.Clipboard}
                      onAction={() => {
                        Clipboard.copy(icon.icon);
                        showToast(Toasts.CopiedPopiconName.Success);
                      }}
                    />
                  </ActionPanel.Section>
                  <PopiconGridPromoActions />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function PopiconGridPromoActions() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        icon={Icon.Download}
        title="Get Popicons"
        url="https://popicons.lemonsqueezy.com/checkout/buy/f9a7311c-34ad-4258-a351-32a464122b1c"
      />
      <Action.OpenInBrowser icon={Icon.Phone} title="Request Custom Icon Set" url="https://cal.com/uxthings/popicons" />
    </ActionPanel.Section>
  );
}
