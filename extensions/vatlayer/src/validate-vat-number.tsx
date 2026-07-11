import { ActionPanel, Action, LaunchProps, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { ErrorResponse, ValidateVATNumberResponse } from "./utils/types";
import { ACCESS_KEY, BASE_URL, DOCS_URL } from "./utils/constants";

export default function ValidateVATNumber(props: LaunchProps<{ arguments: Arguments.ValidateVatNumber }>) {
  const { vat_number } = props.arguments;

  const { isLoading, data, revalidate } = useFetch<ErrorResponse | ValidateVATNumberResponse>(
    `${BASE_URL}validate?` + new URLSearchParams({ access_key: ACCESS_KEY, vat_number })
  );

  const markdown =
    data && "error" in data
      ? `# VAT Number: ${vat_number}
SUCCESS: ❌
  
Code: ${data.error.code}

Type: ${data.error.type}`
      : data
      ? `# VAT Number: ${vat_number}
SUCCESS: ✅`
      : `# VAT Number: ${vat_number}
SUCCESS: ⏳`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !isLoading && data && !("error" in data) ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Valid VAT"
              icon={{
                source: data.valid ? Icon.Check : Icon.Multiply,
                tintColor: data.valid ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label title="Valid Format" icon={data.format_valid ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="Query" text={data.query} />
            <Detail.Metadata.Label title="Country Code" icon={Icon.Map} text={data.country_code} />
            <Detail.Metadata.Label title="Database" icon={data.database === "ok" ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="VAT Number" icon={Icon.Hashtag} text={data.vat_number} />
            <Detail.Metadata.Label title="Company" icon={Icon.Italics} text={data.company_name} />
            <Detail.Metadata.Label title="Address" icon={Icon.House} text={data.company_address} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && !("error" in data) && data.company_name ? (
            <Action.CopyToClipboard title="Copy Company to Clipboard" content={data.company_name} />
          ) : undefined}
          {data && !("error" in data) && data.company_address ? (
            <Action.CopyToClipboard title="Copy Address to Clipboard" content={data.company_address} />
          ) : undefined}
          <Action title={`Revalidate '${vat_number}'`} icon={Icon.Redo} onAction={() => revalidate()} />
          <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL + "historical_rates"} />
        </ActionPanel>
      }
    />
  );
}
