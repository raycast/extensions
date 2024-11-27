import { ActionPanel, Action, Detail, Icon, showToast, Toast, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { ErrorResponse, GetAllVATRatesResponse } from "./utils/types";
import { ACCESS_KEY, BASE_URL, DOCS_URL } from "./utils/constants";

export default function GetAllVATRates() {
  const { isLoading, data } = useFetch<ErrorResponse | GetAllVATRatesResponse>(
    `${BASE_URL}rate_list?` + new URLSearchParams({ access_key: ACCESS_KEY }),
    {
      keepPreviousData: true,
      onWillExecute() {
        showToast({
          title: "Fetching Rates",
          style: Toast.Style.Animated,
        });
      },
      onData(data) {
        if (data.success) {
          showToast({
            title: "SUCCESS!",
            message: `Fetched rates for ${Object.keys(data.rates).length} countries`,
          });
        } else {
          showToast({
            title: "ERROR!",
            message: "Could not fetch rates",
            style: Toast.Style.Failure,
          });
        }
      },
    }
  );

  return data && "error" in data ? (
    <Detail
      markdown={`SUCCESS: ❌
    
Code: ${data.error.code}

Type: ${data.error.type}`}
    />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search country" isShowingDetail>
      {data &&
        Object.entries(data.rates).map(([code, val]) => (
          <List.Item
            key={code}
            icon={Icon.Map}
            title={val.country_name}
            accessories={[{ tag: code }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Standard Rate" text={val.standard_rate.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Reduced Rates" />
                    {Object.entries(val.reduced_rates).map(([type, rate]) => (
                      <List.Item.Detail.Metadata.Label key={type} title={type} text={rate.toString()} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Standard Rate to Clipboard" content={code} />
                <Action.CopyToClipboard
                  title="Copy Reduced Rates to Clipboard as JSON"
                  content={JSON.stringify(val.reduced_rates)}
                />
                <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL + "all_eu_vat_rates"} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
