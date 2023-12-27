import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { ComponentPropsWithoutRef } from "react";

import { PopiconLogo } from "../../enums/popicon-logo";
import { PopiconVariant } from "../../enums/popicon-variant";
import { getVariantName } from "../../helpers/get-variant-name";
import { usePopiconVariant } from "../../hooks/use-popicon-variant";
import { type Prettify } from "../../utilities/types/prettify";
import { PopiconGridContext } from "./popicon-grid-context";
import { PopiconGridItem } from "./popicon-grid-item";
import { PopiconGridSection } from "./popicon-grid-section";

type PopiconGridProps = Prettify<
  Omit<ComponentPropsWithoutRef<typeof Grid>, "searchBarAccessory" | "columns" | "inset" | "searchBarPlaceholder">
>;

function PopiconGrid(props: PopiconGridProps) {
  const [variant, setVariant] = usePopiconVariant(PopiconVariant.Line);

  return (
    <Grid
      {...props}
      searchBarPlaceholder="Search icons..."
      inset={Grid.Inset.Large}
      columns={6}
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
        description="Press enter to request new icons"
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                icon={Icon.Cart}
                title="Request Icon"
                url="https://popicons.lemonsqueezy.com/checkout/buy/422a00c5-611d-46fc-aa4c-8d6176347fd1"
              />
              <Action.OpenInBrowser
                icon={Icon.Phone}
                title="Request Custom Icon Set"
                url="https://cal.com/uxthings/popicons"
              />
              <Action.OpenInBrowser
                icon={Icon.Download}
                title="Get Popicons"
                url="https://popicons.lemonsqueezy.com/checkout/buy/f9a7311c-34ad-4258-a351-32a464122b1c"
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      <PopiconGridContext.Provider value={{ variant }}>{props.children}</PopiconGridContext.Provider>
    </Grid>
  );
}

PopiconGrid.Section = PopiconGridSection;
PopiconGrid.Item = PopiconGridItem;

export { PopiconGrid };
