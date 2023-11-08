import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LaunchProps } from "@raycast/api";
interface ASNResponse {
  isLoading: boolean;
  data?: any;
}

interface ASNArguments {
  asn?: number;
}

export default function Command(props: LaunchProps<{ arguments: ASNArguments }>) {
  const asn = props.arguments.asn as number;
  if (isNaN(asn) == true) {
    return <Detail markdown="Not a number" />;
  }
  const { isLoading, data, revalidate } = useFetch<ASNResponse>(
    `https://api.asrank.caida.org/v2/restful/asns/${props.arguments.asn}`,
  );
  const markdown = `
## AS Number ${asn}
## AS Name: ${data?.data.asn.asnName}
## Source: ${data?.data.asn.source}
## Country: ${data?.data.asn.country.iso}
## Number of Prefixes: ${data?.data.asn.cone.numberPrefixes}`;
  return <Detail isLoading={isLoading} markdown={markdown} />;
}
