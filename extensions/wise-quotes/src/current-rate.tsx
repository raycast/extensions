import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { useWiseQuoteQuery } from "./hooks";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useWiseQuoteQuery({
    sourceAmount: 1,
    targetCurrency: preferences.defaultTargetCurrency,
  });

  return (
    <MenuBarExtra
      icon="https://wise.com/public-resources/assets/icons/wise-personal/favicon.png"
      tooltip={`Current USD:${preferences.defaultTargetCurrency} rate`}
      title={`1 USD = ${data?.rate.toFixed(2)} ${preferences.defaultTargetCurrency}`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title="Refresh rate"
        onAction={() => {
          revalidate();
        }}
      />
    </MenuBarExtra>
  );
}
