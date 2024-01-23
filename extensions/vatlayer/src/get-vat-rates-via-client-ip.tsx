import { ActionPanel, Action, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { ErrorResponse, GetVATRatesViaClientIPResponse } from "./utils/types";
import { ACCESS_KEY, BASE_URL, DOCS_URL } from "./utils/constants";

export default function GetVATRatesViaClientIP() {
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetVATRatesViaClientIPResponse>(
    `${BASE_URL}rate?` + new URLSearchParams({ access_key: ACCESS_KEY, use_client_ip: "1" })
  );

  const markdown =
    data && "error" in data
      ? `# via CLIENT_IP
SUCCESS: ❌
  
Code: ${data.error.code}

Type: ${data.error.type}`
      : data
      ? `# Country Code: ${data.country_code}
SUCCESS: ✅` +
        (data.standard_rate === 0
          ? `

---
NOTE: VAT is 0 as ${data.country_name} is not part of the EU.`
          : "")
      : `# via CLIENT_IP
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
          <Action title={`Revalidate`} icon={Icon.Redo} onAction={() => revalidate()} />
          <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL + "vat_rate_via_client_ip"} />
        </ActionPanel>
      }
    />
  );
}
