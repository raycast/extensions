import { MenuBarExtra, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { Preferences } from "./types";
import { useWiseQuoteQuery } from "./hooks";
import { Error } from "./hooks/useWiseQuoteQuery";
import { WISE_FAV_ICON_URL } from "./constants";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate, error } = useWiseQuoteQuery({
    sourceAmount: 1,
    targetCurrency: preferences.defaultTargetCurrency,
  });

  const tooltip = `Current USD:${preferences.defaultTargetCurrency} rate`;

  if (error) {
    return (
      <MenuBarExtra icon={WISE_FAV_ICON_URL} tooltip={tooltip} title={error?.message ?? "Something went wrong"}>
        {(error as unknown as Error)?.code === "CurrencyCode" && (
          <MenuBarExtra.Item title="Update Target Currency" onAction={openExtensionPreferences} />
        )}
      </MenuBarExtra>
    );
  }

  if (!data && isLoading) {
    return <MenuBarExtra icon={WISE_FAV_ICON_URL} tooltip={tooltip} title="Loading..." isLoading={isLoading} />;
  }

  return (
    <MenuBarExtra
      icon={WISE_FAV_ICON_URL}
      tooltip={tooltip}
      title={`1 USD = ${data?.rate.toFixed(2)} ${preferences.defaultTargetCurrency}`}
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
