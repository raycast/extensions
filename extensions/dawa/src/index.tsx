import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface AddressArguments {
  adgangsadresseid: string;
}

interface DataResponse {
  id: string;
  adressebetegnelse: string;
  kvh: string;
  vejstykke: {
    navn: string;
  };
  husnr: string;
  etage: string;
  dør: string;
  supplerendebynavn: string;
  postnummer: {
    nr: string;
    navn: string;
  };
}

export default function Command(props: { arguments: AddressArguments }) {
  const { adgangsadresseid } = props.arguments;
  const { data, error, isLoading } = useFetch<DataResponse>(`https://dawa.aws.dk/adgangsadresser/${adgangsadresseid}`);
  let addressResult = null;

  if (error) {
    addressResult = `## Failed to fetch address data
  Check your **adgangsadresseid** and try again.
    `;
  } else {
    addressResult = `
  ## Address result for id: ${data?.id ?? "N/A"}

  * **Access address ID**: ${data?.id ?? "N/A"}
  * **Address designation**: ${data?.adressebetegnelse ?? "N/A"}
  * **Kvhx**: ${data?.kvh ?? "N/A"}
  * **Street name:** ${data?.vejstykke.navn ?? "N/A"}
  * **House number:** ${data?.husnr ?? "N/A"}
  * **Floor:** ${data?.etage ?? "N/A"}
  * **Door:** ${data?.dør ?? "N/A"}
  * **Supplementary city name:** ${data?.supplerendebynavn ?? "N/A"}
  * **Zipcode number:** ${data?.postnummer.nr ?? "N/A"}
  * **City:** ${data?.postnummer.navn ?? "N/A"}
  * ${data?.id ? `[Link to DAWA](https://dawa.aws.dk/adgangsadresser/${adgangsadresseid})` : "N/A"}
  `;
  }

  return <Detail isLoading={isLoading} markdown={addressResult} />;
}
