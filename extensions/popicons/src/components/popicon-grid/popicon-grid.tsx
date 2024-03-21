import { ActionPanel, Grid, getPreferenceValues } from "@raycast/api";
import { ComponentPropsWithoutRef, useState } from "react";

import { PopiconLogo } from "../../enums/popicon-logo";
import { PopiconVariant } from "../../enums/popicon-variant";
import { getColumnAmount } from "../../helpers/get-column-amount";
import { getVariantName } from "../../helpers/get-variant-name";
import { usePopiconVariant } from "../../hooks/use-popicon-variant";
import { type Prettify } from "../../utilities/types/prettify";
import { PopiconGridContext } from "./popicon-grid-context";
import { PopiconGridItem } from "./popicon-grid-item";
import { PopiconGridPromoActions } from "./popicon-grid-promo-actions";
import { PopiconGridSection } from "./popicon-grid-section";

const preferences = getPreferenceValues<ExtensionPreferences>();

type PopiconGridProps = Prettify<
  Omit<
    ComponentPropsWithoutRef<typeof Grid>,
    "searchBarAccessory" | "onSelectionChange" | "columns" | "inset" | "searchBarPlaceholder"
  >
>;

function PopiconGrid(props: PopiconGridProps) {
  const [variant, setVariant] = usePopiconVariant(PopiconVariant.Line);

  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  return (
    <Grid
      {...props}
      searchBarPlaceholder="Search icons..."
      inset={Grid.Inset.Large}
      navigationTitle={`Popicons${selectedIconId ? ` - ${selectedIconId}` : ""}`}
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
      <PopiconGridContext.Provider value={{ variant }}>{props.children}</PopiconGridContext.Provider>
    </Grid>
  );
}

PopiconGrid.Section = PopiconGridSection;
PopiconGrid.Item = PopiconGridItem;

export { PopiconGrid };
