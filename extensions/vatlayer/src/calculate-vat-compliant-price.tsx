import { ActionPanel, Action, Detail, Icon, Color, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch, useForm } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { CalculateVATCompliantPriceResponse, ErrorResponse, GetTypesOfGoodsResponse } from "./utils/types";
import { ACCESS_KEY, BASE_URL, DOCS_URL } from "./utils/constants";

type FormValues = {
  amount: string;
  method: string;
  country_code: string;
  ip_address: string;
  type_of_good: string;
  incl?: boolean;
};

export default function FormCalculateVATCompliantPrice() {
  const { push } = useNavigation();

  const { isLoading: isLoadingTypes, data: dataTypes } = useFetch<ErrorResponse | GetTypesOfGoodsResponse>(
    `${BASE_URL}types?` + new URLSearchParams({ access_key: ACCESS_KEY }),
    {
      onWillExecute() {
        showToast({
          title: "Fetching Types",
          style: Toast.Style.Animated,
        });
      },
      onData(data) {
        if (data.success) {
          showToast({
            title: "SUCCESS!",
            message: `Fetched ${data.types.length.toString()} types`,
          });
        } else {
          showToast({
            title: "ERROR!",
            message: "Could not fetch types",
            style: Toast.Style.Failure,
          });
        }
      },
    }
  );

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      const url = new URL(`${BASE_URL}price?`);

      const urlSearchParams = new URLSearchParams({ access_key: ACCESS_KEY, amount: values.amount });
      if (values.method === "country_code") {
        urlSearchParams.append("country_code", values.country_code);
      } else if (values.method === "ip_address") {
        urlSearchParams.append("ip_address", values.ip_address);
      } else {
        urlSearchParams.append("use_client_ip", "1");
      }

      if (values.type_of_good) urlSearchParams.append("type", values.type_of_good);
      if (values.incl) urlSearchParams.append("incl", "1");

      url.search = urlSearchParams.toString();
      push(<CalculateVATCompliantPrice url={url} method={values.method} />);
    },
    validation: {
      amount(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
      },
      country_code(value) {
        if (itemProps.method.value === "country_code")
          if (!value) return "The item is required";
          else if (value.length !== 2) return "The item must be exactly 2 characters long";
          else if (Number(value)) return "The item must not be a number";
      },
      ip_address(value) {
        if (itemProps.method.value === "ip_address") if (!value) return "The item is required";
      },
    },
  });

  return (
    <Form
      isLoading={isLoadingTypes}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Amount" placeholder="150" {...itemProps.amount} />

      <Form.Dropdown title="Method" info="Specify which parameter to use to obtain VAT Rates" {...itemProps.method}>
        <Form.Dropdown.Item title="via Country Code" value="country_code" />
        <Form.Dropdown.Item title="via IP Address" value="ip_address" />
        <Form.Dropdown.Item title="via Client IP" value="use_client_ip" />
      </Form.Dropdown>

      {itemProps.method.value === "country_code" && (
        <Form.TextField title="Country Code" placeholder="GB" {...itemProps.country_code} />
      )}
      {itemProps.method.value === "ip_address" && (
        <Form.TextField title="IP Address" placeholder="176.249.153.36" {...itemProps.ip_address} />
      )}

      <Form.Separator />
      <Form.Dropdown title="Type of Good" {...itemProps.type_of_good}>
        <Form.Dropdown.Item title="STANDARD_PRODUCT" value="" />
        {dataTypes &&
          !("error" in dataTypes) &&
          dataTypes.types.map((type) => <Form.Dropdown.Item key={type} title={type} value={type} />)}
      </Form.Dropdown>
      <Form.Checkbox label="VAT Already Included" {...itemProps.incl} />
    </Form>
  );
}

type CalculateVATCompliantPriceProps = {
  url: URL;
  method: string;
};
function CalculateVATCompliantPrice({ url, method }: CalculateVATCompliantPriceProps) {
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | CalculateVATCompliantPriceResponse>(url.href);

  const commonMarkdown =
    `Amount: ${url.searchParams.get("amount")}
  
Method: ${method}

` +
    (method === "country_code"
      ? `Country Code: ${url.searchParams.get("country_code")}`
      : method === "ip_address"
      ? `IP Address: ${url.searchParams.get("ip_address")}`
      : ``) +
    `

`;

  const markdown =
    data && "error" in data
      ? `SUCCESS: ❌
    
  Code: ${data.error.code}
  
  Type: ${data.error.type}`
      : data
      ? `SUCCESS: ✅` +
        (data.vat_rate === 0
          ? `

---
NOTE: VAT is 0 as ${data.country_name} is not part of the EU.`
          : "")
      : `SUCCESS: ⏳`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={commonMarkdown + markdown}
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
            <Detail.Metadata.Label title="VAT Rate" icon={Icon.Coin} text={data.vat_rate.toString()} />
            <Detail.Metadata.Label title="Price Excluding VAT" icon={Icon.Coin} text={data.price_excl_vat.toString()} />
            <Detail.Metadata.Label
              title="Price Including VAT"
              icon={{ source: Icon.Coin, tintColor: Color.Green }}
              text={data.price_incl_vat.toString()}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && !("error" in data) && (
            <>
              <Action.CopyToClipboard title="Copy Country Name to Clipboard" content={data.country_name} />
              <Action.CopyToClipboard title="Copy Price Excl. VAT to Clipboard" content={data.price_excl_vat} />
              <Action.CopyToClipboard title="Copy Price Incl. VAT to Clipboard" content={data.price_incl_vat} />
              <Action.CopyToClipboard title="Copy VAT Rate to Clipboard" content={data.vat_rate} />
            </>
          )}
          <ActionPanel.Section>
            <Action
              title={`Recalculate '${url.searchParams.get("amount")}' Using ${method}`}
              icon={Icon.Redo}
              onAction={() => revalidate()}
            />
            <Action.OpenInBrowser title="Open API Documentation" url={DOCS_URL + "price_calculation"} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
