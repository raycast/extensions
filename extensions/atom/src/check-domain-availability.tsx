import { Detail, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, parseAtomResponse } from "./atom";
import { AtomDomainAvailability } from "./types";

export default function CheckDomainAvailability(props: LaunchProps<{ arguments: Arguments.CheckDomainAvailability }>) {
  const { domain_name } = props.arguments;
  const { isLoading, data } = useFetch(`${API_URL}/domains/check/${domain_name}`, {
    headers: API_HEADERS,
    parseResponse: parseAtomResponse<AtomDomainAvailability>,
    keepPreviousData: false,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${domain_name} \n\n ${data?.status || ""}`}
      metadata={
        data?.availability === 1 && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Unit Price" text={data.domain_price.unit_price.toString()} />
            <Detail.Metadata.Label title="Renewal Price" text={data.domain_price.renewal_price.toString()} />
            <Detail.Metadata.Label title="ICANN Fee" text={data.domain_price.icann_fee.toString()} />
            <Detail.Metadata.Label title="Is Premium" icon={data.domain_price.is_premium ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Registration Length"
              text={data.domain_price.registration_length.toString()}
            />
            <Detail.Metadata.Label title="Subtotal" text={data.domain_price.subtotal.toString()} />
            <Detail.Metadata.Label title="VAT Rate" text={data.domain_price.vat_rate.toString()} />
            <Detail.Metadata.Label title="VAT Amount" text={data.domain_price.vat_amount.toString()} />
            <Detail.Metadata.Label title="Total" text={data.domain_price.total.toString()} />
          </Detail.Metadata>
        )
      }
    />
  );
}
