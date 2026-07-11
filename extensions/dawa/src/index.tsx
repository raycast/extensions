import { ActionPanel, Action, Detail, Icon } from "@raycast/api";
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
  const { data, error, isLoading } = useFetch<DataResponse>(`https://dawa.aws.dk/adgangsadresser/${adgangsadresseid}`, {
    keepPreviousData: false,
  });
  let addressResult = null;

  if (!isLoading) {
    if (error) {
      addressResult = "## Failed to fetch address data\n Check the `id` and try again.";
    } else {
      addressResult = `
  ## Address result for id: ${data?.id ?? "N/A"}\n\n
  * **Address designation**: ${data?.adressebetegnelse ?? "N/A"}  
  * **Kvhx**: ${data?.kvh ?? "N/A"}
  * **Street name:** ${data?.vejstykke.navn ?? "N/A"} 
  * **House number:** ${data?.husnr ?? "N/A"}
  * **Floor:** ${data?.etage ?? "N/A"}
  * **Door:** ${data?.dør ?? "N/A"}
  * **Supplementary city name:** ${data?.supplerendebynavn ?? "N/A"}
  * **Zipcode number:** ${data?.postnummer.nr ?? "N/A"}
  * **City:** ${data?.postnummer.navn ?? "N/A"}
  `;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={addressResult}
      actions={
        <ActionPanel>
          {data?.id && <Action.OpenInBrowser url={`https://dawa.aws.dk/adgangsadresser/${adgangsadresseid}`} />}
          {data?.adressebetegnelse && (
            <>
              <Action.OpenInBrowser
                url={`https://www.google.com/maps/search/?api=1&query=${encodeURI(data.adressebetegnelse)}`}
                title="Open in Google Maps"
                icon={Icon.Map}
              />
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={data.adressebetegnelse}
                title="Copy Full Address"
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
