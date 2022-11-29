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

  * **Adgangsadresseid**: ${data?.id ?? "N/A"}
  * **Adressebetegnelse**: ${data?.adressebetegnelse ?? "N/A"}
  * **Kvhx**: ${data?.kvh ?? "N/A"}
  * **Vejnavn:** ${data?.vejstykke.navn ?? "N/A"}
  * **Husnr:** ${data?.husnr ?? "N/A"}
  * **Etage:** ${data?.etage ?? "N/A"}
  * **Dør:** ${data?.dør ?? "N/A"}
  * **Supplerende bynavn:** ${data?.supplerendebynavn ?? "N/A"}
  * **Postnr nummer:** ${data?.postnummer.nr ?? "N/A"}
  * **Postnr navn:** ${data?.postnummer.navn ?? "N/A"}
  * ${data?.id ? `[Link to DAWA](https://dawa.aws.dk/adgangsadresser/${adgangsadresseid})` : "N/A"}
  `;
  }

  return <Detail isLoading={isLoading} markdown={addressResult} />;
}
