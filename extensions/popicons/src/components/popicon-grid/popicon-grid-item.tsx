import { Action, ActionPanel, Clipboard, Color, Grid, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import svgtojsx from "svg-to-jsx";
import { changeColor } from "../../helpers/change-color";
import { getSvg } from "../../helpers/get-svg";
import { prettifySvg } from "../../helpers/prettify-svg";
import { Popicon } from "../../schemas/popicon";
import { usePopiconGridContext } from "./popicon-grid-context";
import { PopiconGridPromoActions } from "./popicon-grid-promo-actions";

const displayName = "PopiconGrid.Item";

const preferences = getPreferenceValues<ExtensionPreferences>();

type PopiconGridItemProps = {
  icon: Popicon;
};

function PopiconGridItem(props: PopiconGridItemProps) {
  const { variant } = usePopiconGridContext(displayName);

  return (
    <Grid.Item
      key={props.icon.name}
      id={props.icon.name}
      keywords={[props.icon.name, ...props.icon.tags]}
      content={`data:image/svg+xml,${changeColor(getSvg(props.icon, variant), Color.PrimaryText).replaceAll("\n", "")}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy SVG"
              icon={Icon.Clipboard}
              onAction={() => {
                const rawSvg = getSvg(props.icon, variant);
                const processedSvg = changeColor(rawSvg, preferences.color);
                const prettifiedSvg = prettifySvg(processedSvg);

                Clipboard.copy(prettifiedSvg);
                showToast(Toast.Style.Success, "Copied Icon");
              }}
            />
            <Action
              title="Copy JSX"
              icon={Icon.Clipboard}
              onAction={async () => {
                const rawSvg = getSvg(props.icon, variant);
                const processedSvg = changeColor(rawSvg, preferences.color);
                const prettifiedSvg = prettifySvg(processedSvg);
                const jsxString = await svgtojsx(prettifiedSvg);

                Clipboard.copy(jsxString);
                showToast(Toast.Style.Success, "Copied Icon");
              }}
            />
            <Action
              title="Copy Name"
              icon={Icon.Clipboard}
              onAction={() => {
                Clipboard.copy(props.icon.name);
                showToast(Toast.Style.Success, "Copied Name");
              }}
            />
          </ActionPanel.Section>
          <PopiconGridPromoActions />
        </ActionPanel>
      }
    />
  );
}

PopiconGridItem.displayName = displayName;

export { PopiconGridItem };
