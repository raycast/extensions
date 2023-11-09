import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LaunchProps } from "@raycast/api";
interface ApiResponse {
  data: Data;
}

interface ASNArguments {
  asn?: number;
}
interface Data {
  asn: Asninfo;
}
interface Asninfo {
  asnName: string;
  source: string;
  country: Country;
  cone: Cone;
}

interface Country {
  iso: string;
}

interface Cone {
  numberAsns: number;
  numberPrefixes: number;
  numberAddresses: number;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
export default function Command(props: LaunchProps<{ arguments: ASNArguments }>) {
  const asn = props.arguments.asn as number;
  if (isNaN(asn) == true) {
    return <Detail markdown="Not a number" />;
  }
  const { isLoading, data }: { isLoading: boolean; data?: ApiResponse } = useFetch(
    `https://api.asrank.caida.org/v2/restful/asns/${props.arguments.asn}`,
  );
  const asninfo = data?.data;
  if (isDefined(asninfo)) {
    const markdown = `
## AS Number ${asn}
## AS Name: ${asninfo.asn.asnName}
## Source: ${asninfo.asn.source}
## Country: ${asninfo.asn.country.iso}
## Number of Prefixes: ${asninfo.asn.cone.numberPrefixes}`;
    return <Detail isLoading={isLoading} markdown={markdown} />;
  }
}
