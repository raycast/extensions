import { ActionPanel, Action, LaunchProps, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { ErrorResponse, GetVATRatesViaCountryCodeResponse } from "./utils/types";
import { ACCESS_KEY, BASE_URL, DOCS_URL } from "./utils/constants";

export default function GetVATRatesViaIPAddress(props: LaunchProps<{ arguments: Arguments.GetVatRatesViaIpAddress }>) {
  const { ip_address } = props.arguments;

  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetVATRatesViaCountryCodeResponse>(
    `${BASE_URL}rate?` + new URLSearchParams({ access_key: ACCESS_KEY, ip_address })
  );

  const markdown =
    data && "error" in data
      ? `# IP Address: ${ip_address}
SUCCESS: ❌
  
Code: ${data.error.code}

Type: ${data.error.type}`
      : data
      ? `# IP Address: ${ip_address}
SUCCESS: ✅` +
        (data.standard_rate === 0
          ? `

---
NOTE: VAT is 0 as ${data.country_name} is not part of the EU.`
          : "")
      : `# IP Address: ${ip_address}
SUCCESS: ⏳`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !isLoading && data && !("error" in data) ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Success"
              icon={{
                source: data.success ? Icon.Check : Icon.Multiply,
                tintColor: data.success ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label title="Country Code" icon={Icon.Map} text={data.country_code} />
            <Detail.Metadata.Label title="Country Name" icon={Icon.Italics} text={data.country_name} />
            <Detail.Metadata.Label title="Standard Rate" icon={Icon.Coin} text={data.standard_rate.toString()} />
            {!data.reduced_rates ? (
              <Detail.Metadata.Label title="Reduced Rates" icon={Icon.Coins} />
            ) : (
              <Detail.Metadata.TagList title="Reduced Rates">
                {Object.entries(data.reduced_rates).map(([key, val]) => (
                  <Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && !("error" in data) && data.standard_rate ? (
            <Action.CopyToClipboard title="Copy Standard Rate to Clipboard" content={data.standard_rate} />
          ) : undefined}
          {data && !("error" in data) && data.reduced_rates ? (
            <Action.CopyToClipboard
              title="Copy Reduced Rates to Clipboard as JSON"
              content={JSON.stringify(data.reduced_rates)}
            />
          ) : undefined}
          <Action title={`Revalidate '${ip_address}'`} icon={Icon.Redo} onAction={() => revalidate()} />
          <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL + "vat_rate_via_ip_address"} />
        </ActionPanel>
      }
    />
  );
}
